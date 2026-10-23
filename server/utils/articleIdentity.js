/*
 * What makes two scraped articles "the same".
 *
 * Deduplication used to compare raw URLs only, which let through:
 *   - the same page with different tracking parameters (?utm_source=...),
 *   - the same story syndicated by two outlets under near-identical titles,
 *   - the same job posted on LinkedIn and Careerlink.
 */

const TRACKING_PARAM = /^(utm_|mc_|fbclid$|gclid$|igshid$|ref$|ref_src$|source$|spm$|cmpid$)/i

/**
 * Canonical form of a URL: https, lower-case host, no fragment, no tracking
 * parameters, sorted remaining parameters, no trailing slash.
 *
 * @param {string} raw
 * @returns {string} the canonical URL, or the input unchanged if it is not a URL
 */
export function canonicalUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw
  try {
    const url = new URL(raw.trim())
    url.protocol = 'https:'
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()

    const kept = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAM.test(key))
    kept.sort(([a], [b]) => a.localeCompare(b))
    url.search = ''
    for (const [key, value] of kept) url.searchParams.append(key, value)

    // Strip the trailing slash from the path itself: stripping it from the final
    // string misses URLs that still have a query after it.
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.toString()
  } catch {
    return raw
  }
}

/** Lower-cased word tokens of a title, punctuation removed (Unicode-aware). */
export function titleTokens(title = '') {
  return new Set(
    String(title)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1),
  )
}

/** Jaccard similarity of two token sets: |A ∩ B| / |A ∪ B|. */
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / (a.size + b.size - shared)
}

/** Company name of a job summary shaped like "Company · Location" or "Company — Salary". */
export function companyOf(article) {
  return String(article.summary || '')
    .split(/\s[·—-]\s/)[0]
    .trim()
    .toLowerCase()
}

/**
 * Removes articles that duplicate an earlier one, by canonical URL or by a
 * near-identical title.
 *
 * Titles are compared by token overlap, which catches reworded headlines
 * ("TSMC to build chip plant in Arizona" / "TSMC will build Arizona chip plant")
 * that exact matching misses. Jobs additionally need the same company, because a
 * title like "FPGA Engineer" is shared by unrelated employers.
 *
 * Earlier items win, so pass the list best-first.
 *
 * @param {object[]} articles
 * @param {{threshold?: number, sameCompany?: boolean}} [options]
 */
export function dedupeArticles(articles, { threshold = 0.8, sameCompany = false } = {}) {
  const urls = new Set()
  const kept = []

  for (const article of articles) {
    if (!article?.url || !article?.title) continue

    const url = canonicalUrl(article.url)
    if (urls.has(url)) continue

    const tokens = titleTokens(article.title)
    const company = sameCompany ? companyOf(article) : null
    const isNearDuplicate = kept.some(
      (other) =>
        (!sameCompany || other.company === company) &&
        jaccard(tokens, other.tokens) >= threshold,
    )
    if (isNearDuplicate) continue

    urls.add(url)
    kept.push({ article, tokens, company })
  }

  return kept.map(({ article }) => article)
}

/**
 * Picks `count` articles by score while capping how many may come from one
 * source, so a single outlet cannot take every slot (the last measured run gave
 * all five job slots to LinkedIn). If the cap leaves slots empty, the best of the
 * skipped ones fill them.
 *
 * @param {object[]} articles  sorted best-first
 * @param {number} count
 * @param {number} maxPerSource
 */
export function selectDiverse(articles, count, maxPerSource) {
  const taken = []
  const skipped = []
  const perSource = new Map()

  for (const article of articles) {
    if (taken.length >= count) break
    const used = perSource.get(article.source) ?? 0
    if (used >= maxPerSource) {
      skipped.push(article)
      continue
    }
    perSource.set(article.source, used + 1)
    taken.push(article)
  }

  for (const article of skipped) {
    if (taken.length >= count) break
    taken.push(article)
  }

  return taken
}
