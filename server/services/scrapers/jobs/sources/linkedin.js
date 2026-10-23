import * as cheerio from 'cheerio'

import { JOB_SEARCH_QUERIES } from '../../../../constants/jobKeywords.js'
import { trackSource } from '../../../runReport.js'
import { get, mapLimit, sleep } from '../../http.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant } from '../utils.js'

const SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'

const LINKEDIN_QUERIES = Array.from(
  new Set([
    ...JOB_SEARCH_QUERIES,
    'semiconductor vietnam',
    'ic design vietnam',
    'chip design vietnam',
    'embedded vietnam',
    'analog layout vietnam',
    'verification engineer vietnam',
    'fpga vietnam',
    'vlsi vietnam',
    'asic vietnam',
    'rtl design vietnam',
  ]),
).filter((query) => query.length <= 40)

/** Generic topics worth a second page of results. */
const DEEP_QUERIES = new Set(['embedded', 'semiconductor', 'ic design', 'embedded vietnam'])

// LinkedIn throttles guest traffic (the last measured run was reset mid-query),
// so keep this low: two requests at a time, with a pause between them.
const CONCURRENCY = 2
const PAUSE_MS = 700

/** Parses one page of guest-API HTML into job articles. Exported for tests. */
export function parseLinkedInCards(html) {
  const $ = cheerio.load(html)
  const jobs = []

  $('.base-card').each((_, el) => {
    const title = $(el).find('.base-search-card__title').text().trim()
    const company = $(el).find('.base-search-card__subtitle').text().trim()
    const location = $(el).find('.job-search-card__location').text().trim()

    let link = $(el).find('a.base-card__full-link').attr('href')
    if (!link) return
    if (link.startsWith('/')) link = `https://www.linkedin.com${link}`

    // The card carries the real posting date. Without it every job was stamped
    // "now", so recency scoring gave all of them the same bonus and stale
    // postings looked as fresh as new ones.
    const postedAt = $(el).find('time').first().attr('datetime')

    const summary = [company, location].filter(Boolean).join(' · ')
    if (!isJobRelevant(title, summary)) return

    const article = buildJobArticle({
      title,
      summary,
      url: link,
      source: 'LinkedIn',
      publishedAt: postedAt || new Date(),
    })
    if (article) jobs.push(article)
  })

  return jobs
}

async function fetchPage(keywords, start, signal) {
  const { data } = await get(
    SEARCH_URL,
    {
      params: { keywords, location: 'Vietnam', start },
      headers: getBrowserHeaders({ Accept: 'text/html' }),
      timeout: 20_000,
    },
    { signal },
  )
  return data
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export async function fetchLinkedIn(ctx) {
  return trackSource(ctx, 'LinkedIn', async (note) => {
    const articles = []
    const seen = new Set()

    const outcomes = await mapLimit(LINKEDIN_QUERIES, CONCURRENCY, async (keywords) => {
      if (ctx.signal?.aborted) return []

      const pages = [await fetchPage(keywords, 0, ctx.signal)]

      if (DEEP_QUERIES.has(keywords)) {
        await sleep(PAUSE_MS)
        // A failed second page costs depth, not the query.
        pages.push(await fetchPage(keywords, 25, ctx.signal).catch(() => ''))
      }

      await sleep(PAUSE_MS)
      return pages.flatMap((html) => (html ? parseLinkedInCards(html) : []))
    })

    let failures = 0
    let firstError = ''
    for (const outcome of outcomes) {
      if (outcome instanceof Error) {
        failures += 1
        firstError ||= outcome.message
        continue
      }
      for (const article of outcome) {
        if (seen.has(article.url)) continue
        seen.add(article.url)
        articles.push(article)
      }
    }

    if (failures === outcomes.length && outcomes.length > 0) throw new Error(`every query failed (${firstError})`)
    if (failures > 0) note(`${failures} of ${outcomes.length} queries failed (${firstError})`)
    return articles
  })
}
