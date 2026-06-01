import axios from 'axios'
import { GREENHOUSE_BOARDS } from '../../../../constants/jobKeywords.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant, stripHtml, delay } from '../utils.js'

export async function fetchGreenhouse() {
  const articles = []

  for (const board of GREENHOUSE_BOARDS) {
    try {
      const { data } = await axios.get(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
        {
          headers: getBrowserHeaders({ Accept: 'application/json' }),
          timeout: 20000,
        }
      )

      for (const job of data?.jobs || []) {
        const title = job.title || ''
        const summary = stripHtml(job.content || '').slice(0, 500)
        if (!isJobRelevant(title, summary)) continue

        const article = buildJobArticle({
          title,
          summary: summary || `${board} careers`,
          url: job.absolute_url,
          source: `Greenhouse (${board})`,
          publishedAt: job.updated_at || job.created_at,
        })
        if (article) articles.push(article)
      }

      await delay(300)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(`Greenhouse ${board}:`, err.message)
      }
    }
  }

  console.log(`Greenhouse: ${articles.length} jobs`)
  return articles
}
