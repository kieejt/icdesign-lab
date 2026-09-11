import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 *
 * Used for search boxes so typing "transistor" issues one request instead of ten.
 *
 * @template T
 * @param {T} value
 * @param {number} [delay] ms of quiet before the value is published
 * @returns {T}
 */
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
