const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/*
 * Page-view tracking.
 *
 * Two problems with doing this inline in a component:
 *   - React 18 StrictMode mounts effects twice in development, so every
 *     navigation was counted twice locally;
 *   - the request was awaited on the render path, adding latency to a
 *     navigation for a metric nobody is waiting on.
 *
 * `sendBeacon` hands the request to the browser, which delivers it out of band
 * and survives the page being unloaded mid-flight. `fetch(keepalive)` is the
 * fallback where it isn't available.
 */

/** Last path recorded, so a re-render or StrictMode double-mount doesn't double-count. */
let lastTracked = null

/**
 * Record a view of `path`. Never throws and never blocks the caller.
 *
 * @param {string} path
 */
export function trackPageView(path) {
  if (!path || path === lastTracked) return
  lastTracked = path

  const url = `${API_BASE}/analytics/track`
  const payload = JSON.stringify({ url: path })

  try {
    if (navigator.sendBeacon) {
      // Sent as text/plain on purpose. It is one of the three CORS-safelisted
      // request content types, so the browser skips the preflight — and
      // sendBeacon cannot perform a preflight, so an application/json beacon
      // is silently dropped whenever the API is on another origin. The server
      // parses text/plain bodies as JSON for exactly this reason.
      navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain;charset=UTF-8' }))
      return
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: payload,
      credentials: 'include',
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics failures are never worth surfacing to a visitor.
  }
}

export default { trackPageView }
