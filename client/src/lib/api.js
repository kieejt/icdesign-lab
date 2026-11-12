/*
 * A small HTTP client with the slice of axios's interface this site uses.
 *
 * axios was ~17 kB (Brotli) on the critical path of every first visit, for
 * features the site never touches (interceptors, adapters, transforms). This
 * covers what the pages actually call — get/post/put/patch/delete, `params`,
 * JSON or FormData bodies, `timeout`, `signal`, `onUploadProgress` — and keeps
 * axios's shapes: `response.data`, and errors carrying `response.status`,
 * `response.data` and `code` ('ERR_CANCELED', 'ECONNABORTED', 'ERR_NETWORK',
 * 'ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE'), so no call site had to change.
 *
 * XMLHttpRequest rather than fetch: it is the only browser API that reports
 * upload progress, which the gallery and people uploads show.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const DEFAULT_TIMEOUT = 15000

/** Serialises params the way axios does: arrays as `k[]=`, dates as ISO, nulls skipped. */
function serializeParams(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  const append = (key, value) => {
    if (value === undefined || value === null) return
    if (value instanceof Date) search.append(key, value.toISOString())
    else if (typeof value === 'object') search.append(key, JSON.stringify(value))
    else search.append(key, value)
  }
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => append(`${key}[]`, item))
    else append(key, value)
  }
  return search.toString()
}

function buildUrl(url, params) {
  const full = /^https?:\/\//.test(url) ? url : `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
  const query = serializeParams(params)
  if (!query) return full
  return `${full}${full.includes('?') ? '&' : '?'}${query}`
}

function parseHeaders(raw) {
  const headers = {}
  raw
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const index = line.indexOf(':')
      if (index > 0) headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim()
    })
  return headers
}

function parseBody(text) {
  if (!text) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function makeError(message, code, config, response) {
  const error = new Error(message)
  error.name = code === 'ERR_CANCELED' ? 'CanceledError' : 'AxiosError'
  error.code = code
  error.config = config
  error.response = response
  error.isAxiosError = true
  return error
}

function request(config) {
  const { method = 'get', url, params, data, headers = {}, timeout = DEFAULT_TIMEOUT, signal, onUploadProgress } = config

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeError('canceled', 'ERR_CANCELED', config))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open(method.toUpperCase(), buildUrl(url, params), true)
    xhr.withCredentials = true
    xhr.timeout = timeout

    let body = data
    const outgoing = { Accept: 'application/json, text/plain, */*', ...headers }
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      // The browser must write this header itself: it adds the multipart boundary.
      for (const name of Object.keys(outgoing)) if (name.toLowerCase() === 'content-type') delete outgoing[name]
    } else if (data !== undefined && data !== null && typeof data !== 'string') {
      body = JSON.stringify(data)
      if (!Object.keys(outgoing).some((name) => name.toLowerCase() === 'content-type')) {
        outgoing['Content-Type'] = 'application/json'
      }
    }
    for (const [name, value] of Object.entries(outgoing)) xhr.setRequestHeader(name, value)

    if (onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = (event) =>
        onUploadProgress({ loaded: event.loaded, total: event.lengthComputable ? event.total : undefined, event })
    }

    const onAbort = () => xhr.abort()
    const cleanup = () => signal?.removeEventListener('abort', onAbort)
    signal?.addEventListener('abort', onAbort)

    xhr.onload = () => {
      cleanup()
      const response = {
        data: parseBody(xhr.responseText),
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        config,
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response)
      } else {
        const code = xhr.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST'
        reject(makeError(`Request failed with status code ${xhr.status}`, code, config, response))
      }
    }
    xhr.onerror = () => {
      cleanup()
      reject(makeError('Network Error', 'ERR_NETWORK', config))
    }
    xhr.ontimeout = () => {
      cleanup()
      reject(makeError(`timeout of ${timeout}ms exceeded`, 'ECONNABORTED', config))
    }
    xhr.onabort = () => {
      cleanup()
      reject(makeError('canceled', 'ERR_CANCELED', config))
    }

    xhr.send(body ?? null)
  })
}

const api = {
  request,
  get: (url, config = {}) => request({ ...config, method: 'get', url }),
  delete: (url, config = {}) => request({ ...config, method: 'delete', url }),
  post: (url, data, config = {}) => request({ ...config, method: 'post', url, data }),
  put: (url, data, config = {}) => request({ ...config, method: 'put', url, data }),
  patch: (url, data, config = {}) => request({ ...config, method: 'patch', url, data }),
}

/*
 * Collapse identical in-flight GETs.
 *
 * Several components mount at once on a page transition and independently ask
 * for the same resource. Without this, each one opens its own request; with it,
 * the first caller creates the promise and everyone else awaits that same one.
 */
const inFlight = new Map()

function keyFor(config) {
  const params = config.params ? JSON.stringify(config.params) : ''
  return `${config.url}?${params}`
}

/**
 * GET that is de-duplicated across concurrent callers.
 *
 * @param {string} url    path relative to the API base
 * @param {object} [config] request config (params, signal, ...)
 * @returns {Promise<{data: any, status: number, headers: object}>}
 */
export function getShared(url, config = {}) {
  // An explicit abort signal means the caller owns this request's lifetime, so
  // sharing it with another component would let one unmount cancel the other.
  if (config.signal) return api.get(url, config)

  const key = keyFor({ url, ...config })
  const pending = inFlight.get(key)
  if (pending) return pending

  const request = api.get(url, config).finally(() => {
    inFlight.delete(key)
  })

  inFlight.set(key, request)
  return request
}

export default api
