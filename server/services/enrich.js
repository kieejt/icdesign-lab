import * as cheerio from 'cheerio'

import { cleanText } from '../utils/html.js'
import { BROWSER_UA } from './scrapers/feeds.js'
import { get, mapLimit } from './scrapers/http.js'

/** A usable Date, or null. */
function validDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Description, publication date and image from an article page. Exported for tests.
 *
 * Every big CMS publishes these as Open Graph / article meta tags or JSON-LD, which
 * is far more stable than scraping the page layout.
 *
 * @param {string} html
 * @returns {{description: string, publishedAt: Date|null, image: string}}
 */
export function parseArticlePage(html) {
  const $ = cheerio.load(html)
  const meta = (selector) => $(selector).first().attr('content') || ''

  const description = cleanText(meta('meta[property="og:description"]') || meta('meta[name="description"]'))
  const image = meta('meta[property="og:image"]')

  let publishedAt =
    validDate(meta('meta[property="article:published_time"]')) ||
    validDate(meta('meta[itemprop="datePublished"]')) ||
    validDate(meta('meta[name="pubdate"]')) ||
    validDate(meta('meta[name="article:published_time"]'))

  if (!publishedAt) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (publishedAt) return
      const match = $(el).contents().text().match(/"datePublished"\s*:\s*"([^"]+)"/)
      publishedAt = validDate(match?.[1])
    })
  }
  publishedAt ||= validDate($('time[datetime]').first().attr('datetime'))

  return { description, publishedAt, image }
}

/**
 * Fills in what a listing page could not show, for articles marked `needsDetails`.
 *
 * Only the shortlist is enriched, so this is a few dozen requests per run rather
 * than one per headline per page. A page that cannot be read leaves the article
 * with its estimates and the flag set; it is still a usable candidate.
 *
 * @template {{url: string, needsDetails?: boolean}} T
 * @param {T[]} articles
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<T[]>} new objects; the inputs are not modified
 */
export async function enrichArticles(articles, { signal } = {}) {
  const needed = articles.filter((a) => a.needsDetails)
  if (needed.length === 0) return articles

  const details = new Map()
  await mapLimit(needed, 4, async (article) => {
    try {
      const response = await get(
        article.url,
        { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi,en;q=0.8' }, timeout: 10_000, responseType: 'text' },
        { signal, retries: 0 },
      )
      details.set(article.url, parseArticlePage(response.data))
    } catch {
      // keep the estimates
    }
  })

  return articles.map((article) => {
    const found = details.get(article.url)
    if (!found) return article

    const { needsDetails, ...rest } = article
    return {
      ...rest,
      summary: found.description || article.summary,
      publishedAt: found.publishedAt || article.publishedAt,
      thumbnail: article.thumbnail || found.image || '',
    }
  })
}
