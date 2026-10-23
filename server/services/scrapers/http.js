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
      return await axios({ timeout: 20_000, ...config, signal })
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) throw error

      const status = error.response?.status
      const retryable = RETRYABLE_STATUS.has(status) || RETRYABLE_CODES.has(error.code)
      if (!retryable || attempt >= retries) throw error

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
