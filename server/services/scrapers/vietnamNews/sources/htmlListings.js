import * as cheerio from 'cheerio'

import { cleanText } from '../../../../utils/html.js'
import { trackSource } from '../../../runReport.js'
import { BROWSER_UA } from '../../feeds.js'
import { get, mapLimit } from '../../http.js'
import { isBlockedPage } from '../../pages.js'

/*
 * Vietnamese sources that have no usable RSS feed, read from their topic pages.
 *
 * Each entry is a tag or search page already filtered to the subject, so nearly
 * every headline on it is on topic (measured: 24 of 24 on Tia Sáng, 17 of 29 on
 * Tuổi Trẻ, 14 of 22 on SGGP, 12 of 21 on CafeF). A listing page shows headlines
 * only, so candidates are marked `needsDetails` and the agent fetches the article
 * itself (description, real date, image) for the few that reach the shortlist,
 * instead of requesting every article on every page each run.
 *
 * `hrefPattern` separates article links from navigation, which is the part that
 * breaks when a site is redesigned: a listing that yields nothing is reported as
 * such in the run record.
 *
 * To add a site: open its tag or search page, copy the URL, and set `hrefPattern`
 * to what an article URL path looks like (usually a trailing numeric id).
 */
export const LISTINGS = [
  { name: 'Tia Sáng · bán dẫn', publisher: 'Tia Sáng', url: 'https://tiasang.com.vn/tim-kiem?q=b%C3%A1n+d%E1%BA%ABn', hrefPattern: /-\d{6,}\.html$/ },
  { name: 'Tia Sáng · vi mạch', publisher: 'Tia Sáng', url: 'https://tiasang.com.vn/tim-kiem?q=vi+m%E1%BA%A1ch', hrefPattern: /-\d{6,}\.html$/ },
  { name: 'Tuổi Trẻ · bán dẫn', publisher: 'Tuổi Trẻ', url: 'https://tuoitre.vn/ban-dan.html', hrefPattern: /-\d{14,}\.htm$/ },
  { name: 'Sài Gòn Giải Phóng · thiết kế vi mạch', publisher: 'Sài Gòn Giải Phóng', url: 'https://www.sggp.org.vn/thiet-ke-vi-mach-tag306474.html', hrefPattern: /-post\d+\.html$/ },
  { name: 'Báo Chính phủ · bán dẫn', publisher: 'Báo Chính phủ', url: 'https://baochinhphu.vn/tim-kiem.htm?keywords=b%C3%A1n+d%E1%BA%ABn', hrefPattern: /-\d{14,}\.htm$/ },
  { name: 'CafeF · bán dẫn', publisher: 'CafeF', url: 'https://cafef.vn/ban-dan.html', hrefPattern: /-\d{15,}\.chn$/ },
  { name: 'Mekong ASEAN · vi mạch', publisher: 'Mekong ASEAN', url: 'https://mekongasean.vn/tag/vi-mach-12613.tag', hrefPattern: /-\d{4,}\.html$/ },
]

const MAX_PER_LISTING = 12

/** Headlines are not shown with a date on these pages; assume "about a day and a half ago". */
const ESTIMATED_AGE_MS = 36 * 3600 * 1000

/**
 * Article links on a listing page. Exported for tests.
 *
 * @param {string} html
 * @param {typeof LISTINGS[number]} listing
 */
export function extractListing(html, listing) {
  const $ = cheerio.load(html)
  const seen = new Set()
  const found = []

  $('a[href]').each((_, el) => {
    if (found.length >= MAX_PER_LISTING) return

    const title = cleanText($(el).attr('title') || $(el).text())
    if (title.length < 25 || title.length > 220) return

    let url
    try {
      url = new URL($(el).attr('href'), listing.url)
    } catch {
      return
    }
    if (url.host.replace(/^www\./, '') !== new URL(listing.url).host.replace(/^www\./, '')) return
    if (!listing.hrefPattern.test(url.pathname)) return

    url.hash = ''
    if (seen.has(url.toString())) return
    seen.add(url.toString())

    found.push({
      title,
      summary: '',
      url: url.toString(),
      source: listing.publisher,
      category: 'Vietnam News',
      publishedAt: new Date(Date.now() - ESTIMATED_AGE_MS),
      // A topic page: everything on it matched the subject.
      strictMatch: true,
      // The agent fetches the article for its description, date and image.
      needsDetails: true,
    })
  })

  return found
}

/** @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx */
export const fetchVietnamListings = async (ctx) => {
  const perListing = await mapLimit(LISTINGS, 3, (listing) =>
    trackSource(ctx, listing.name, async (note) => {
      const response = await get(
        listing.url,
        { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi,en;q=0.8' }, timeout: 20_000, responseType: 'text' },
        { signal: ctx.signal, retries: 1 },
      )
      if (isBlockedPage(response.data)) throw new Error('blocked by the site (access denied page)')

      const articles = extractListing(response.data, listing)
      if (articles.length === 0) note('no article links matched; the page layout may have changed')
      return articles
    }),
  )

  return perListing.flat()
}
