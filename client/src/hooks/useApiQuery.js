import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import { getShared } from '../lib/api'

/*
 * A small stale-while-revalidate cache for API reads.
 *
 * The problem it solves: every page here fetched in a bare `useEffect`, so going
 * Home → Students → Home refetched the homepage from scratch and showed a
 * spinner over an empty layout each time — even though the data was seconds old
 * and unchanged.
 *
 * Behaviour:
 *   - a cached entry renders instantly, with no loading state;
 *   - if it is older than `staleTime` it is revalidated in the background and
 *     swapped in when it lands, so the visitor never sees a blank frame;
 *   - identical concurrent requests are collapsed into one (see lib/api).
 *
 * The cache is an external store read through `useSyncExternalStore`, which is
 * what that API exists for: components subscribe to it directly instead of
 * mirroring it into local state inside an effect.
 *
 * It is deliberately ~150 lines rather than a dependency: this is the entire
 * feature set the site needs.
 */

const cache = new Map()
const listeners = new Map()

/**
 * Fetches currently in flight, keyed the same way as the cache.
 *
 * Two components mounting in the same commit both see a stale entry and would
 * both start a request. This map lets the second one join the first instead.
 */
const pending = new Map()

const DEFAULT_STALE_TIME = 60_000
const MAX_ENTRIES = 120

/**
 * Shared empty entry.
 *
 * `useSyncExternalStore` compares snapshots by identity and throws on an
 * infinite loop if the getter returns a fresh object each call, so the
 * "nothing cached" snapshot must be one constant.
 */
const EMPTY = Object.freeze({ data: undefined, error: null, updatedAt: 0, validating: false })

function notify(key) {
  listeners.get(key)?.forEach((listener) => listener())
}

function writeCache(key, entry) {
  // Bounded LRU-ish eviction: Map preserves insertion order, so the first key is
  // the least recently written. Re-writing a key moves it to the end.
  if (cache.has(key)) cache.delete(key)
  cache.set(key, entry)

  while (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value)
  }

  notify(key)
}

function subscribeTo(key, listener) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(listener)

  return () => {
    const set = listeners.get(key)
    if (!set) return
    set.delete(listener)
    if (set.size === 0) listeners.delete(key)
  }
}

/**
 * Drop cached entries so the next read hits the network.
 *
 * @param {string|RegExp} [match] key prefix or pattern; omit to clear everything
 */
export function invalidateQueries(match) {
  const keys = [...cache.keys()]

  if (match === undefined) {
    cache.clear()
    keys.forEach(notify)
    return
  }

  const matches = match instanceof RegExp ? (k) => match.test(k) : (k) => k.startsWith(match)
  for (const key of keys) {
    if (matches(key)) {
      cache.delete(key)
      notify(key)
    }
  }
}

/** Builds a stable cache key. Sorted, so `{a,b}` and `{b,a}` are one entry. */
function buildKey(url, params) {
  if (!params) return url
  const query = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

/**
 * Fetch `url` and keep the result in the shared cache.
 *
 * @param {string|null} url        path relative to the API base; `null` skips the fetch
 * @param {object} [options]
 * @param {object} [options.params]     query params (also part of the cache key)
 * @param {number} [options.staleTime]  ms a cached value is served without revalidating
 * @param {boolean} [options.enabled]   set false to hold the request
 * @param {(data:any)=>any} [options.select] shape the payload for this caller
 * @returns {{data: any, error: Error|null, loading: boolean, isValidating: boolean, refetch: () => Promise<void>}}
 */
export function useApiQuery(url, options = {}) {
  const { params, staleTime = DEFAULT_STALE_TIME, enabled = true, select } = options

  const key = url && enabled ? buildKey(url, params) : null

  // `params` is a fresh object every render, so it is read through a ref that is
  // synced in an effect. Effects run in declaration order, so this one has
  // always applied before the fetch effect below reads it.
  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  })

  const entry = useSyncExternalStore(
    useCallback((listener) => (key ? subscribeTo(key, listener) : () => {}), [key]),
    useCallback(() => (key ? cache.get(key) ?? EMPTY : EMPTY), [key]),
  )

  const fetchNow = useCallback(() => {
    if (!key || !url) return Promise.resolve()

    // Already running for this key — join it rather than opening a second request.
    const inFlight = pending.get(key)
    if (inFlight) return inFlight

    writeCache(key, { ...(cache.get(key) ?? EMPTY), validating: true })

    const request = getShared(url, { params: paramsRef.current })
      .then((response) => {
        writeCache(key, {
          data: response.data,
          error: null,
          updatedAt: Date.now(),
          validating: false,
        })
      })
      .catch((err) => {
        // Keep any previously good data on screen and surface the error beside
        // it, rather than blanking the page on a transient failure.
        writeCache(key, {
          data: cache.get(key)?.data,
          error: err,
          updatedAt: Date.now(),
          validating: false,
        })
      })
      .finally(() => {
        pending.delete(key)
      })

    pending.set(key, request)
    return request
  }, [key, url])

  /*
   * The request is deliberately not aborted on unmount.
   *
   * Its result lands in the shared cache, where it is useful to whatever mounts
   * next — and because the store, not component state, receives the write, an
   * unmounted subscriber simply stops listening. Aborting would throw away a
   * response that has already been paid for.
   */
  useEffect(() => {
    if (!key) return
    const cached = cache.get(key)
    const isFresh = cached && cached.updatedAt > 0 && Date.now() - cached.updatedAt <= staleTime
    if (!isFresh) fetchNow()
  }, [key, staleTime, fetchNow])

  const refetch = useCallback(() => {
    if (key) {
      cache.delete(key)
      pending.delete(key)
    }
    return fetchNow()
  }, [key, fetchNow])

  // `select` runs at read time rather than write time, so two callers can shape
  // the same cached payload differently. Memoised on the raw data so the result
  // keeps a stable identity across renders and downstream memos don't churn.
  const data = useMemo(
    () => (select && entry.data !== undefined ? select(entry.data) : entry.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `select` is an inline lambda at every call site; the raw payload is the real input.
    [entry.data],
  )

  return {
    data,
    error: entry.error,
    // Only a genuine cold start counts as "loading" — a background refresh of
    // data already on screen must not flash a skeleton over it.
    loading: Boolean(key) && entry.updatedAt === 0 && entry.data === undefined && !entry.error,
    isValidating: entry.validating,
    refetch,
  }
}

export default useApiQuery
