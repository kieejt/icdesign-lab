import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

import axios from 'axios'

/*
 * HTTP helpers shared by every scraper.
 *
 * The scrapers used to call axios directly with no retry, so one dropped
 * connection (LinkedIn answered a query with ECONNRESET in the last measured run)
 * silently cost that query's results, and every source worked through its
 * queries one at a time with fixed sleeps, which made the jobs sources take 45 s
 * while news took 1-5 s.
 */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/*
 * Outbound requests are limited to the public internet.
 *
 * Every URL fetched here ultimately comes from somebody else: a feed item, a
 * search result, a redirect. Without a check, a feed entry pointing at
 * http://169.254.169.254/ (the cloud metadata service), http://localhost:5000/
 * or the database host would make this server fetch it from the inside and
 * feed the answer into article summaries. The check runs on the address a name
 * actually resolves to (so DNS tricks and rebinding do not help) and again on
 * every redirect. Tests that serve fixtures from 127.0.0.1 set
 * ALLOW_PRIVATE_FETCH=1.
 */
const allowPrivate = () => process.env.ALLOW_PRIVATE_FETCH === '1'

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

/** True when `address` (IPv4 or IPv6 text) is a routable public address. */
export function isPublicAddress(address) {
  const kind = net.isIP(address)
  if (kind === 4) {
    const [a, b] = address.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false // this-net, private, loopback, multicast/reserved
    if (a === 100 && b >= 64 && b <= 127) return false // carrier-grade NAT
    if (a === 169 && b === 254) return false // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && (b === 168 || (b === 0 && address.startsWith('192.0.0.')))) return false
    if (a === 198 && (b === 18 || b === 19)) return false // benchmarking
    return true
  }
  if (kind === 6) {
    const lower = address.toLowerCase()
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicAddress(mapped[1])
    if (lower === '::' || lower === '::1') return false
    if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith('ff')) return false // ULA, link-local, multicast
    return true
  }
  return false
}

/** `lookup` for http(s) agents: resolves normally, then refuses non-public results. */
function guardedLookup(hostname, options, callback) {
  const opts = typeof options === 'function' ? {} : options
  const done = typeof options === 'function' ? options : callback
  dns.lookup(hostname, opts, (error, address, family) => {
    if (error || allowPrivate()) return done(error, address, family)

    const list = Array.isArray(address) ? address : [{ address, family }]
    const allowed = list.filter((entry) => isPublicAddress(entry.address))
    if (allowed.length === 0) {
      return done(Object.assign(new Error(`Blocked request to a non-public address (${hostname})`), { code: 'EBLOCKED' }))
    }
    return Array.isArray(address) ? done(null, allowed) : done(null, allowed[0].address, allowed[0].family)
  })
}

const guardedAgents = {
  httpAgent: new http.Agent({ lookup: guardedLookup }),
  httpsAgent: new https.Agent({ lookup: guardedLookup }),
}

/** Rejects non-http(s) URLs and IP-literal hosts that are not public (those skip DNS, so `lookup` never sees them). */
function assertFetchable(rawUrl) {
  const url = new URL(rawUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw Object.assign(new Error(`Blocked request with protocol ${url.protocol}`), { code: 'EBLOCKED' })
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!allowPrivate() && net.isIP(host) && !isPublicAddress(host)) {
    throw Object.assign(new Error(`Blocked request to a non-public address (${host})`), { code: 'EBLOCKED' })
  }
}

function checkRedirect(options) {
  assertFetchable(`${options.protocol || 'https:'}//${options.hostname || options.host}/`)
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN', 'EPIPE'])

/**
 * axios request with retry and exponential backoff.
 *
 * Only failures that can succeed on a second try are retried: timeouts, resets,
 * 408/425/429 and 5xx. A 403 or 404 is a definite answer, so it fails at once. A
 * `Retry-After` header is honoured (capped, so a hostile value cannot stall a run).
 *
 * @param {import('axios').AxiosRequestConfig} config
 * @param {{retries?: number, baseDelayMs?: number, signal?: AbortSignal}} [options]
 */
export async function request(config, { retries = 2, baseDelayMs = 700, signal } = {}) {
  let attempt = 0

  for (;;) {
    try {
      assertFetchable(config.url)
      return await axios({
        timeout: 20_000,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_RESPONSE_BYTES,
        ...guardedAgents,
        beforeRedirect: checkRedirect,
        ...config,
        signal,
      })
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) throw error

      const status = error.response?.status
      const retryable = RETRYABLE_STATUS.has(status) || RETRYABLE_CODES.has(error.code)
      if (error.code === 'EBLOCKED' || !retryable || attempt >= retries) throw error

      const retryAfter = Number(error.response?.headers?.['retry-after'])
      const base = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 10_000) : baseDelayMs * 2 ** attempt
      // Jitter, so parallel requests that failed together do not retry together.
      await sleep(base * (0.75 + Math.random() * 0.5))
      attempt += 1
    }
  }
}

export const get = (url, config = {}, options) => request({ ...config, url, method: 'get' }, options)
export const post = (url, data, config = {}, options) => request({ ...config, url, data, method: 'post' }, options)

/**
 * Runs `fn` over `items` with at most `limit` in flight, preserving order.
 * `fn` is expected to handle its own errors; one rejection does not stop the rest
 * (its slot holds the error), because a failed query must not abandon the others.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<(R | Error)[]>}
 */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0

  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        results[index] = await fn(items[index], index)
      } catch (error) {
        results[index] = error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Gives a task a time budget. The signal is aborted when the budget runs out;
 * tasks check it between requests and return whatever they have collected, so a
 * slow source costs its own tail, not the whole run.
 *
 * @template T
 * @param {number} ms
 * @param {(signal: AbortSignal) => Promise<T>} task
 */
export async function withDeadline(ms, task) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await task(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}
