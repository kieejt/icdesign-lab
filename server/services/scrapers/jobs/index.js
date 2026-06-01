import { fetchVietnamWorks } from './sources/vietnamworks.js'
import { fetchLinkedIn } from './sources/linkedin.js'
import { fetchRemotive } from './sources/remotive.js'
import { fetchRemoteOk } from './sources/remoteok.js'
import { fetchGreenhouse } from './sources/greenhouse.js'
import { dedupeJobs } from './utils.js'

export const fetchJobs = async () => {
  console.log('Fetching jobs from multiple sources...')

  const results = await Promise.allSettled([
    fetchVietnamWorks(),
    fetchLinkedIn(),
    fetchRemotive(),
    fetchRemoteOk(),
    fetchGreenhouse(),
  ])

  let articles = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value)
    } else {
      console.error('Job source failed:', result.reason?.message || result.reason)
    }
  }

  articles = dedupeJobs(articles)
  console.log(`Jobs scraper collected ${articles.length} unique articles`)
  return articles
}
