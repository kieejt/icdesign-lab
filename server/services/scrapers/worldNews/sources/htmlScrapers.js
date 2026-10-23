import * as cheerio from 'cheerio'

import { trackSource } from '../../../runReport.js'
import { BROWSER_UA } from '../../feeds.js'
import { get, mapLimit } from '../../http.js'

// DIGITIMES (https://www.digitimes.com/topic/semiconductors/) was listed here but
// answers every automated request with an "Access denied" page, so it never
// produced an article. Re-add it if it ever allows scrapers.
const HTML_SOURCES = [
  {
    name: "Tom's Hardware (Semiconductors)",
    url: 'https://www.tomshardware.com/tech-industry/manufacturing/semiconductors',
  },
]

const HEADERS = { 'User-Agent': BROWSER_UA }
const MAX_PER_SOURCE = 4

/**
 * Reads the page's own description so the AI ranker has real content to judge,
 * instead of a placeholder string. Failures yield an empty description.
 */
async function fetchArticleDescription(url, signal) {
  try {
    const response = await get(url, { headers: HEADERS, timeout: 10_000 }, { signal, retries: 0 })
    const $ = cheerio.load(response.data)
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''
    return description.trim()
  } catch {
    return ''
  }
}

/**
 * Bot-protection pages come back with status 200, so a status check alone treats
 * "Access denied" as a normal empty page. Recognise the common ones by title.
 */
export function isBlockedPage(html) {
  const title = String(html).match(/<title>([^<]*)/i)?.[1] ?? ''
  return /access denied|attention required|just a moment|are you a robot|forbidden/i.test(title)
}

/** Candidate article links on a listing page: anchors whose text reads like a headline. */
export function extractCandidates(html, source) {
  const $ = cheerio.load(html)
  const seenLinks = new Set()
  const candidates = []

  $('a').each((_, el) => {
    if (candidates.length >= MAX_PER_SOURCE) return

    let title = $(el).find('h2, h3, .title, .article-name').first().text().trim() || $(el).text().trim()
    title = title.replace(/\s+/g, ' ')

    let link = $(el).attr('href')
    if (!title || title.length <= 30 || !link || seenLinks.has(link)) return
    seenLinks.add(link)

    if (link.startsWith('/')) link = `${new URL(source.url).origin}${link}`

    candidates.push({
      title,
      url: link,
      source: source.name,
      category: 'World News',
      // The listing page carries no dates. Twelve hours back keeps these from
      // always winning the "newest" comparison against real RSS items.
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      // These are dedicated semiconductor pages, so every link is on topic.
      strictMatch: true,
    })
  })

  return candidates
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export const fetchWorldNewsHtml = async (ctx) => {
  const perSource = await mapLimit(HTML_SOURCES, 2, (source) =>
    trackSource(ctx, source.name, async (note) => {
      const response = await get(source.url, { headers: HEADERS, timeout: 15_000 }, { signal: ctx.signal, retries: 1 })
      if (isBlockedPage(response.data)) throw new Error('blocked by the site (access denied page)')

      const candidates = extractCandidates(response.data, source)
      if (candidates.length === 0) note('no article links found; the page layout may have changed')

      const descriptions = await mapLimit(candidates, 4, (candidate) => fetchArticleDescription(candidate.url, ctx.signal))
      return candidates.map((candidate, i) => ({
        ...candidate,
        summary: (typeof descriptions[i] === 'string' && descriptions[i]) || `News article from ${candidate.source}.`,
      }))
    }),
  )

  return perSource.flat()
}
