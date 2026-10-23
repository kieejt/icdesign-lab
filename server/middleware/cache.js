/**
 * Two complementary caching layers for public, read-only endpoints.
 *
 *  1. `httpCache` sets Cache-Control so browsers and any CDN/reverse proxy in
 *     front of the API can serve repeats without touching Node at all.
 *  2. `microCache` keeps rendered JSON payloads in process for a few seconds so
 *     a burst of identical requests costs one Mongo round-trip, not N.
 *
 * Both are deliberately short-lived: the site's content changes through the
 * admin console, and `invalidateCache` is called on every write so an edit is
 * visible immediately rather than after the TTL expires.
 */

const store = new Map()

/** Namespaces whose data is embedded in the aggregated `home` payload. */
const HOME_DEPENDENCIES = new Set(['research', 'members', 'recruitment', 'news'])

/** Namespaces whose data is embedded in sitemap and link-preview responses. */
const SEO_DEPENDENCIES = new Set(['research', 'members', 'lab-events', 'gallery'])

const now = () => Date.now()

/** Drop expired entries. Cheap because the store only holds public GET payloads. */
function sweep() {
  const t = now()
  for (const [key, entry] of store) {
    if (entry.expiresAt <= t) store.delete(key)
  }
}

let sweepTimer = null
function ensureSweeper() {
  if (sweepTimer) return
  sweepTimer = setInterval(sweep, 60_000)
  // Never hold the event loop open just for cache housekeeping.
  sweepTimer.unref?.()
}

/**
 * Sets `Cache-Control` for a public GET response.
 *
 * `stale-while-revalidate` lets a proxy hand back the slightly-stale copy
 * instantly while it refreshes in the background — the visitor never waits.
 *
 * @param {number} maxAge  seconds a client may reuse the response
 * @param {number} swr     seconds it may keep serving it while revalidating
 */
export function httpCache(maxAge = 60, swr = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    // A signed-in user is almost always an admin who has just changed something.
    // Letting their browser reuse a two-minute-old list made every save look like
    // it had failed, so their requests are always revalidated. Anonymous visitors
    // (no cookie, no Authorization header) keep the full public cache.
    const signedIn = Boolean(req.cookies?.token || req.headers.authorization)
    if (signedIn) {
      res.set('Cache-Control', 'private, no-cache')
    } else {
      res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`)
    }
    // Shared caches and browsers must not hand one audience the other's copy.
    res.vary('Cookie')
    next()
  }
}

/**
 * In-process response cache keyed by namespace + full request URL.
 *
 * @param {string} namespace  invalidation group, e.g. 'news' or 'members'
 * @param {number} ttlMs      how long a payload stays fresh
 */
export function microCache(namespace, ttlMs = 30_000) {
  ensureSweeper()

  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    const key = `${namespace}:${req.originalUrl}`
    const hit = store.get(key)

    if (hit && hit.expiresAt > now()) {
      res.set('X-Cache', 'HIT')
      return res.json(hit.body)
    }

    res.set('X-Cache', 'MISS')

    // Tap res.json so the handler stays completely unaware of the cache.
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, { body, expiresAt: now() + ttlMs, namespace })
      }
      return originalJson(body)
    }

    next()
  }
}

/**
 * Purge one namespace (or everything). Call after any write so admins see their
 * own edit reflected on the public site straight away.
 *
 * @param {string} [namespace] omit to clear the whole cache
 */
export function invalidateCache(namespace) {
  if (!namespace) {
    store.clear()
    return
  }
  // The homepage payload aggregates these resources, so a write to any of them
  // must also drop it.
  const dropHome = HOME_DEPENDENCIES.has(namespace)
  const dropSeo = SEO_DEPENDENCIES.has(namespace)
  for (const [key, entry] of store) {
    if (
      entry.namespace === namespace ||
      (dropHome && entry.namespace === 'home') ||
      (dropSeo && entry.namespace === 'seo')
    ) {
      store.delete(key)
    }
  }
}

/**
 * Express middleware that clears `namespace` once a mutating request succeeds.
 * Mounted on the router so every POST/PUT/PATCH/DELETE below it self-invalidates.
 */
export function invalidateOnWrite(namespace) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next()

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) invalidateCache(namespace)
    })
    next()
  }
}

export default { httpCache, microCache, invalidateCache, invalidateOnWrite }
