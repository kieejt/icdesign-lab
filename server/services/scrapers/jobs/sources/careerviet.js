import * as cheerio from 'cheerio'

import { cleanText } from '../../../../utils/html.js'
import { trackSource } from '../../../runReport.js'
import { get, mapLimit, sleep } from '../../http.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant } from '../utils.js'

/*
 * CareerViet (careerviet.vn), a Vietnamese job board with server-rendered search
 * pages. TopCV, ITviec, JobsGO, Glints and Indeed answer scrapers with 403/404, so
 * this is the readable one of the boards that were tried.
 */

const BASE = 'https://careerviet.vn'
const QUERIES = ['semiconductor', 'ic-design', 'fpga', 'vlsi', 'asic', 'embedded', 'verification-engineer', 'ban-dan']

/** "Cập nhật: 22-10-2026" -> Date, or null. */
export function parseUpdatedDate(text = '') {
  const match = String(text).match(/Cập nhật:\s*(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 5)) // ~noon in Vietnam
  return Number.isNaN(date.getTime()) ? null : date
}

/** Parses one search results page into job articles. Exported for tests. */
export function parseCareerVietJobs(html) {
  const $ = cheerio.load(html)
  const jobs = []

  $('.job-item').each((_, el) => {
    const card = $(el)
    const link = card.find('h2 a.job_link').first()
    const title = cleanText(link.attr('title') || link.text())
    const href = link.attr('href')
    if (!title || !href) return

    const company = cleanText(card.find('.company-name').first().text())
    const location = cleanText(card.find('.location').first().attr('title') || card.find('.location').first().text())
    // Company first, so near-duplicate detection can tell employers apart.
    const summary = [company, location].filter(Boolean).join(' · ')
    if (!isJobRelevant(title, summary)) return

    const article = buildJobArticle({
      title,
      summary,
      url: new URL(href, BASE).toString(),
      source: 'CareerViet',
      publishedAt: parseUpdatedDate(card.text()),
    })
    if (article) jobs.push(article)
  })

  return jobs
}

/** @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx */
export async function fetchCareerViet(ctx) {
  return trackSource(ctx, 'CareerViet', async (note) => {
    const outcomes = await mapLimit(QUERIES, 2, async (query) => {
      if (ctx.signal?.aborted) return []
      const { data } = await get(
        `${BASE}/viec-lam/${query}-k-vi.html`,
        { headers: getBrowserHeaders({ Accept: 'text/html' }), timeout: 20_000, responseType: 'text' },
        { signal: ctx.signal },
      )
      await sleep(400)
      return parseCareerVietJobs(data)
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
