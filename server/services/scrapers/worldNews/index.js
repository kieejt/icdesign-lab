import { fetchWorldNewsRss } from './sources/rssSources.js'
import { fetchWorldNewsHtml } from './sources/htmlScrapers.js'
import { dedupeNews } from './utils.js'
import { ARTICLES_PER_CATEGORY, SCRAPER_MIN_POOL } from '../../../constants/news.js'

export const fetchWorldNews = async () => {
  console.log('Fetching world news from multiple sources...')

  const results = await Promise.allSettled([
    fetchWorldNewsRss(),
    fetchWorldNewsHtml(),
  ])

  let articles = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value)
    } else {
      console.error('World News source failed:', result.reason?.message || result.reason)
    }
  }

  articles = dedupeNews(articles)

  // Sort: strict matches first, then by date descending
  articles.sort((a, b) => {
    if (a.strictMatch && !b.strictMatch) return -1
    if (!a.strictMatch && b.strictMatch) return 1
    return b.publishedAt - a.publishedAt
  })

  // We want to return at least ARTICLES_PER_CATEGORY, ideally SCRAPER_MIN_POOL.
  // The filtering logic above already pulls both strict and relaxed matches.
  // We can just return the top N.
  const finalArticles = articles.slice(0, Math.max(SCRAPER_MIN_POOL, ARTICLES_PER_CATEGORY))

  console.log(`World News scraper collected ${finalArticles.length} unique articles`)
  
  // Clean up strictMatch flag before returning as it's not in the schema
  return finalArticles.map(a => {
    const { strictMatch, ...rest } = a
    return rest
  })
}
