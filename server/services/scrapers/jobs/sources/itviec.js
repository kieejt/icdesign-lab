import axios from 'axios'
import * as cheerio from 'cheerio'
import { ITVIEC_SKILL_SLUGS } from '../../../../constants/jobKeywords.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant, delay } from '../utils.js'

const BASE = 'https://itviec.com'

export async function fetchItviec() {
  const articles = []
  const seen = new Set()

  for (const slug of ITVIEC_SKILL_SLUGS) {
    try {
      const { data: html } = await axios.get(`${BASE}/it-jobs/${slug}`, {
        headers: getBrowserHeaders({
          Accept: 'text/html,application/xhtml+xml',
          Referer: 'https://itviec.com/',
        }),
        timeout: 20000,
      })

      const $ = cheerio.load(html)

      $('a[href*="/it-jobs/"]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href || href.includes('/it-jobs?') || href.endsWith('/it-jobs')) return

        const path = href.startsWith('http') ? new URL(href).pathname : href
        if (!path.match(/\/it-jobs\/[a-z0-9-]+-[a-z0-9-]+/i) && !path.match(/\/it-jobs\/[^/]+$/)) return

        const url = href.startsWith('http') ? href.split('?')[0] : `${BASE}${path}`
        if (seen.has(url)) return

        const title =
          $(el).find('h3').text().trim() ||
          $(el).attr('title')?.trim() ||
          $(el).text().trim().replace(/\s+/g, ' ')
        if (!title || title.length < 5 || title.length > 200) return

        if (!isJobRelevant(title, slug)) return

        seen.add(url)
        const company =
          $(el).closest('.job, .job-item, [class*="job"]').find('[class*="company"]').text().trim() ||
          ''

        const article = buildJobArticle({
          title,
          summary: company ? `${company} — ITviec` : `ITviec · ${slug}`,
          url,
          source: 'ITviec',
          publishedAt: new Date(),
        })
        if (article) articles.push(article)
      })

      await delay(800)
    } catch (err) {
      const status = err.response?.status
      console.error(`ITviec /it-jobs/${slug}:`, status === 403 ? 'blocked (403)' : err.message)
    }
  }

  console.log(`ITviec: ${articles.length} jobs`)
  return articles
}
