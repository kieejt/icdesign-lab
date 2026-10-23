import * as cheerio from 'cheerio'

import { trackSource } from '../../../runReport.js'
import { get, mapLimit, sleep } from '../../http.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant } from '../utils.js'

// A subset of the search terms, to keep the request count low.
const QUERIES = ['ic-design', 'semiconductor', 'embedded', 'fpga', 'vlsi']

/** Parses a Careerlink search page into job articles. Exported for tests. */
export function parseCareerlinkJobs(html) {
  const $ = cheerio.load(html)
  const jobs = []

  $('.job-link').each((_, el) => {
    const title = $(el).find('h2, .job-title').text().trim() || $(el).attr('title')
    let link = $(el).attr('href')
    if (!link) return
    if (link.startsWith('/')) link = `https://www.careerlink.vn${link}`

    const company = $(el).find('.company-name').text().trim() || 'Careerlink Job'
    if (!isJobRelevant(title || link, company)) return

    const article = buildJobArticle({
      title: title || 'Careerlink Job',
      summary: company,
      url: link,
      source: 'Careerlink',
      // The listing shows no machine-readable date.
      publishedAt: new Date(),
    })
    if (article) jobs.push(article)
  })

  return jobs
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export async function fetchCareerlink(ctx) {
  return trackSource(ctx, 'Careerlink', async (note) => {
    const outcomes = await mapLimit(QUERIES, 2, async (query) => {
      if (ctx.signal?.aborted) return []
      const { data } = await get(
        `https://www.careerlink.vn/viec-lam/k/${query}`,
        { headers: getBrowserHeaders({ Accept: 'text/html' }), timeout: 20_000 },
        { signal: ctx.signal },
      )
      await sleep(500)
      return parseCareerlinkJobs(data)
    })

    const seen = new Set()
    const articles = []
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

    if (failures === outcomes.length) throw new Error(`every query failed (${firstError})`)
    if (failures > 0) note(`${failures} of ${outcomes.length} queries failed (${firstError})`)
    return articles
  })
}
