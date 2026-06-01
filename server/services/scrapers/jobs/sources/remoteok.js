import axios from 'axios'
import { buildJobArticle, getBrowserHeaders, isJobRelevant, stripHtml } from '../utils.js'

export async function fetchRemoteOk() {
  const articles = []

  try {
    const { data } = await axios.get('https://remoteok.com/api', {
      headers: getBrowserHeaders({ Accept: 'application/json' }),
      timeout: 30000,
    })

    const jobs = Array.isArray(data) ? data.filter((j) => j && j.id && j.position) : []

    for (const job of jobs) {
      const title = job.position || ''
      const summary = stripHtml(job.description || '').slice(0, 500)
      if (!isJobRelevant(title, summary)) continue

      const url = job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : null)
      const article = buildJobArticle({
        title,
        summary: summary || job.company || '',
        url,
        source: 'RemoteOK',
        publishedAt: job.date ? new Date(job.date) : new Date(),
        thumbnail: job.company_logo || '',
      })
      if (article) articles.push(article)
    }
  } catch (err) {
    console.error('RemoteOK:', err.message)
  }

  console.log(`RemoteOK: ${articles.length} jobs`)
  return articles
}
