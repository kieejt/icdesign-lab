import { fetchVietnamWorks } from './sources/vietnamworks.js'
import { fetchLinkedIn } from './sources/linkedin.js'
import { fetchCareerlink } from './sources/careerlink.js'
import { dedupeJobs } from './utils.js'

export const fetchJobs = async () => {
  console.log('Fetching jobs from multiple sources...')

  const results = await Promise.allSettled([
    fetchVietnamWorks(),
    fetchLinkedIn(),
    fetchCareerlink(),
  ])

  let articles = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      // Limit each source to max 15 jobs to prevent one source (like LinkedIn) from dominating the top scores
      const sourceArticles = result.value.slice(0, 15)
      articles.push(...sourceArticles)
    } else {
      console.error('Job source failed:', result.reason?.message || result.reason)
    }
  }

  articles = dedupeJobs(articles)
  console.log(`Jobs scraper collected ${articles.length} unique articles`)
  return articles
}
