import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/*
 * List-view state — page number, search text, filters — stored in the query
 * string instead of component state.
 *
 * Why the query string and not a path segment like `/page/2`:
 *
 *   - Several lists carry filters as well as a page (`/documents` has a search
 *     box and two filters). Those have to be query params, and one convention
 *     across every list beats `/documents/page/2?search=vlsi`.
 *   - A path segment would collide with the detail routes added alongside these:
 *     `/research/project/page` sits in exactly the same shape as
 *     `/research/project/:id`.
 *   - Omitting defaults keeps the common case clean — page 1 with no filters is
 *     just `/documents`, not `/documents?page=1&type=All`.
 *
 * What it buys: reloading keeps your place, a filtered list can be sent to
 * someone, and Back steps through pages instead of leaving the list entirely.
 */

/**
 * Reads and writes list state in the URL.
 *
 * @param {Record<string, string|number>} defaults
 *   The full set of recognised keys with their default values. Must be a module
 *   constant, not an inline object — it is part of the memo key. A numeric
 *   default makes that key numeric (and clamped to >= 1).
 *
 * @returns {{
 *   values: Record<string, string|number>,
 *   update: (patch: object, options?: {replace?: boolean}) => void,
 *   hrefFor: (patch: object) => string,
 * }}
 */
export default function useListParams(defaults) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Serialised so a caller that (against advice) passes an inline object does
  // not re-derive on every render.
  const defaultsKey = JSON.stringify(defaults)

  const values = useMemo(() => {
    const parsed = {}

    for (const [key, fallback] of Object.entries(defaults)) {
      const raw = searchParams.get(key)

      if (raw === null || raw === '') {
        parsed[key] = fallback
        continue
      }

      if (typeof fallback === 'number') {
        const n = Number(raw)
        // A junk page number falls back rather than sending NaN to the API.
        parsed[key] = Number.isFinite(n) ? Math.max(Math.trunc(n), 1) : fallback
      } else {
        parsed[key] = raw
      }
    }

    return parsed
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultsKey stands in for defaults
  }, [searchParams, defaultsKey])

  /** Applies `patch` to the current params and returns the new query string. */
  const buildSearch = useCallback(
    (patch, base) => {
      const next = new URLSearchParams(base)

      for (const [key, value] of Object.entries(patch)) {
        // Anything at its default is dropped, so the URL only ever carries what
        // actually differs from the plain list.
        if (value === undefined || value === null || value === '' || value === defaults[key]) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }

      // Changing a filter invalidates the page number: page 4 of the old result
      // set is usually past the end of the new one.
      if (!('page' in patch) && 'page' in defaults) next.delete('page')

      const query = next.toString()
      return query ? `?${query}` : ''
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultsKey stands in for defaults
    [defaultsKey],
  )

  const update = useCallback(
    (patch, options = {}) => {
      setSearchParams(
        (prev) => new URLSearchParams(buildSearch(patch, prev)),
        // `replace` for things that change as you type, so Back doesn't have to
        // walk out of the list one keystroke at a time.
        { replace: options.replace ?? false },
      )
    },
    [setSearchParams, buildSearch],
  )

  const hrefFor = useCallback(
    (patch) => buildSearch(patch, searchParams) || '?',
    [buildSearch, searchParams],
  )

  return { values, update, hrefFor }
}
