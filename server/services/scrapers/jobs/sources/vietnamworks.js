import { JOB_SEARCH_QUERIES } from '../../../../constants/jobKeywords.js'
import { trackSource } from '../../../runReport.js'
import { post, mapLimit, sleep } from '../../http.js'
import { buildJobArticle, getBrowserHeaders, stripHtml, isJobRelevant } from '../utils.js'

const API_URL = 'https://ms.vietnamworks.com/job-search/v1.0/search'
const CONCURRENCY = 3

/** Turns one API hit into a job article, or null when it is not relevant. */
export function jobFromHit(job) {
  if (!job?.jobUrl) return null

  const summary =
    stripHtml(job.jobDescription)?.slice(0, 500) || `${job.companyName || ''} — ${job.prettySalary || ''}`.trim()
  if (!isJobRelevant(job.jobTitle, summary)) return null

  return buildJobArticle({
    title: job.jobTitle,
    // Company first, so near-duplicate detection can tell employers apart.
    summary: job.companyName ? `${job.companyName} — ${summary}` : summary,
    url: job.jobUrl,
    source: 'VietnamWorks',
    publishedAt: job.approvedOn || job.createdOn,
    thumbnail: job.companyLogo,
  })
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export async function fetchVietnamWorks(ctx) {
  return trackSource(ctx, 'VietnamWorks', async (note) => {
    const articles = []
    const seen = new Set()

    const outcomes = await mapLimit(JOB_SEARCH_QUERIES, CONCURRENCY, async (query) => {
      if (ctx.signal?.aborted) return null

      // `page` is zero-based. It was sent as 1, which asks for the *second* page:
      // every query with a single page of results came back empty and this source
      // silently returned no jobs at all.
      const { data } = await post(
        API_URL,
        { query, page: 0, hitsPerPage: 40 },
        {
          headers: getBrowserHeaders({
            'Content-Type': 'application/json',
            Origin: 'https://www.vietnamworks.com',
            Referer: 'https://www.vietnamworks.com/',
          }),
        },
        { signal: ctx.signal },
      )

      await sleep(200)
      return data?.data || []
    })

    let failures = 0
    let firstError = ''
    for (const outcome of outcomes) {
      if (outcome instanceof Error) {
        failures += 1
        firstError ||= outcome.message
        continue
      }
      for (const hit of outcome || []) {
        const article = jobFromHit(hit)
        if (!article || seen.has(article.url)) continue
        seen.add(article.url)
        articles.push(article)
      }
    }

    if (failures === outcomes.length && outcomes.length > 0) throw new Error(`every query failed (${firstError})`)
    if (failures > 0) note(`${failures} of ${outcomes.length} queries failed (${firstError})`)
    return articles
  })
}
