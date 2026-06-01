import axios from 'axios'
import { JOB_SEARCH_QUERIES } from '../../../../constants/jobKeywords.js'
import { buildJobArticle, getBrowserHeaders, stripHtml, delay, isJobRelevant } from '../utils.js'

const API_URL = 'https://ms.vietnamworks.com/job-search/v1.0/search'

export async function fetchVietnamWorks() {
  const articles = []
  const seen = new Set()

  for (const query of JOB_SEARCH_QUERIES) {
    try {
      const { data } = await axios.post(
        API_URL,
        { query, page: 1, hitsPerPage: 40 },
        {
          headers: getBrowserHeaders({
            'Content-Type': 'application/json',
            Origin: 'https://www.vietnamworks.com',
            Referer: 'https://www.vietnamworks.com/',
          }),
          timeout: 20000,
        }
      )

      const jobs = data?.data || []
      for (const job of jobs) {
        const url = job.jobUrl
        if (!url || seen.has(url)) continue
        seen.add(url)

        const summary =
          stripHtml(job.jobDescription)?.slice(0, 500) ||
          `${job.companyName || ''} — ${job.prettySalary || ''}`.trim()

        if (!isJobRelevant(job.jobTitle, summary)) continue

        const article = buildJobArticle({
          title: job.jobTitle,
          summary,
          url,
          source: 'VietnamWorks',
          publishedAt: job.approvedOn || job.createdOn,
          thumbnail: job.companyLogo,
        })
        if (article) articles.push(article)
      }

      await delay(400)
    } catch (err) {
      console.error(`VietnamWorks search "${query}":`, err.message)
    }
  }

  console.log(`VietnamWorks: ${articles.length} jobs`)
  return articles
}
