import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
})

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
 * @param {object} [config] axios config (params, signal, ...)
 * @returns {Promise<import('axios').AxiosResponse>}
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
