import axios from 'axios'
import { buildJobArticle, getBrowserHeaders, isJobRelevant, stripHtml } from '../utils.js'

export async function fetchRemotive() {
  const articles = []

  try {
    const { data } = await axios.get('https://remotive.com/api/remote-jobs', {
      headers: getBrowserHeaders({ Accept: 'application/json' }),
      timeout: 30000,
    })

    for (const job of data?.jobs || []) {
      const title = job.title || ''
      const summary = stripHtml(job.description || '').slice(0, 500)
      if (!isJobRelevant(title, summary)) continue

      const article = buildJobArticle({
        title,
        summary: summary || job.company_name || '',
        url: job.url || job.job_url,
        source: 'Remotive',
        publishedAt: job.publication_date,
        thumbnail: job.company_logo || '',
      })
      if (article) articles.push(article)
    }
  } catch (err) {
    console.error('Remotive:', err.message)
  }

  console.log(`Remotive: ${articles.length} jobs`)
  return articles
}
