import Parser from 'rss-parser'

import { cleanText } from '../../utils/html.js'
import { trackSource } from '../runReport.js'
import { BROWSER_UA } from './feeds.js'
import { get, mapLimit } from './http.js'

/*
 * Keyword-driven news aggregators.
 *
 * The Vietnamese outlets' own feeds are broad technology sections: measured on
 * 50-100 items each, a handful held a semiconductor story and most held none.
 * Google News and Bing News search *every* outlet by keyword, so the same
 * request returns almost only on-topic stories (94-100 of 100 for "bán dẫn",
 * "vi mạch", "thiết kế chip"), with outlets such as VnExpress, Tuổi Trẻ, VTV,
 * VnEconomy and Tia Sáng that have no useful feed of their own.
 */

const parser = new Parser({ customFields: { item: ['source', 'News:Source'] } })

/** Search window. Keeps results fresh and well inside the agent's age limit. */
const WINDOW = '7d'

const googleUrl = (query, { lang, country, when = WINDOW }) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:${when}`)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`

const bingUrl = (query, market) => `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=${market}`

// "ASIC" is deliberately not searched on its own: in Vietnamese and Australian
// news it is overwhelmingly the Australian securities regulator.
const VIETNAMESE = { lang: 'vi', country: 'VN' }
const ENGLISH = { lang: 'en-US', country: 'US', when: '3d' }

export const GOOGLE_QUERIES = [
  { name: 'Google News · bán dẫn', category: 'Vietnam News', url: googleUrl('bán dẫn', VIETNAMESE) },
  { name: 'Google News · vi mạch', category: 'Vietnam News', url: googleUrl('vi mạch', VIETNAMESE) },
  { name: 'Google News · thiết kế chip', category: 'Vietnam News', url: googleUrl('"thiết kế chip" OR "thiết kế vi mạch"', VIETNAMESE) },
  { name: 'Google News · bán dẫn Việt Nam', category: 'Vietnam News', url: googleUrl('"bán dẫn" "Việt Nam" nhà máy OR đào tạo OR đầu tư', VIETNAMESE) },
  { name: 'Google News · FPGA', category: 'Vietnam News', url: googleUrl('FPGA', VIETNAMESE) },
  { name: 'Google News · semiconductor', category: 'World News', url: googleUrl('semiconductor OR "chip design" OR "EDA tools"', ENGLISH) },
  { name: 'Google News · IC design', category: 'World News', url: googleUrl('"IC design" OR VLSI OR FPGA OR RISC-V', ENGLISH) },
]

export const BING_QUERIES = [
  { name: 'Bing News · bán dẫn', category: 'Vietnam News', url: bingUrl('bán dẫn', 'vi-VN') },
  { name: 'Bing News · vi mạch', category: 'Vietnam News', url: bingUrl('vi mạch thiết kế', 'vi-VN') },
]

const MAX_ITEMS = 40

/** Publisher name, from the feed's source tag or the " - Publisher" title suffix. */
function publisherOf(item, fallback) {
  const tagged = item.source?._ ?? item.source ?? item['News:Source']
  const name = cleanText(typeof tagged === 'string' ? tagged : '')
  if (name) return name
  const suffix = String(item.title || '').match(/ - ([^-]{2,40})$/)
  return suffix ? suffix[1].trim() : fallback
}

/**
 * One Google News result as an article.
 *
 * The link stays Google's redirect: since 2024 the article id is encrypted, so the
 * publisher URL cannot be recovered without a browser. There is no snippet either,
 * only the headline; the ranking prompt forbids adding facts that are not in the
 * text it is given.
 */
export function googleItemToArticle(item, query) {
  const publisher = publisherOf(item, 'Google News')
  const title = cleanText(item.title).replace(new RegExp(`\\s+-\\s+${publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')

  return {
    title,
    // Empty on purpose: copying the headline here would double-count its keywords
    // in the score and make this redirect copy outrank the direct link.
    summary: '',
    url: item.link,
    source: publisher,
    category: query.category,
    publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
    strictMatch: true, // the query itself was the topic filter
  }
}

/**
 * One Bing News result as an article. Bing's link is a click-tracker that carries
 * the real URL in its `url` parameter, and the item has a real snippet.
 */
export function bingItemToArticle(item, query) {
  let url = item.link
  try {
    const real = new URL(item.link).searchParams.get('url')
    if (real) url = real
  } catch {
    // keep the tracker link
  }

  return {
    title: cleanText(item.title),
    summary: cleanText(item.contentSnippet || item.content || ''),
    url,
    source: publisherOf(item, 'Bing News'),
    category: query.category,
    publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
    strictMatch: true,
  }
}

async function readQueries(ctx, queries, toArticle) {
  const perQuery = await mapLimit(queries, 3, (query) =>
    trackSource(ctx, query.name, async () => {
      const response = await get(
        query.url,
        { responseType: 'text', timeout: 15_000, headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi,en;q=0.8' } },
        { signal: ctx.signal, retries: 1 },
      )
      const feed = await parser.parseString(response.data)
      return (feed.items || []).slice(0, MAX_ITEMS).filter((item) => item.title && item.link).map((item) => toArticle(item, query))
    }),
  )
  return perQuery.flat()
}

/** @param {{report: import('../runReport.js').RunReport, signal?: AbortSignal}} ctx */
export const fetchGoogleNews = (ctx) => readQueries(ctx, GOOGLE_QUERIES, googleItemToArticle)

/** @param {{report: import('../runReport.js').RunReport, signal?: AbortSignal}} ctx */
export const fetchBingNews = (ctx) => readQueries(ctx, BING_QUERIES, bingItemToArticle)
