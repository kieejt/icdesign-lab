import { fetchVietnamNewsRss } from './sources/rssSources.js'
import { dedupeNews } from './utils.js'
import { ARTICLES_PER_CATEGORY, SCRAPER_MIN_POOL } from '../../../constants/news.js'

export const fetchVietnamNews = async () => {
  console.log('Fetching Vietnam news from multiple sources...')

  const results = await Promise.allSettled([
    fetchVietnamNewsRss(),
  ])

  let articles = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value)
    } else {
      console.error('Vietnam News source failed:', result.reason?.message || result.reason)
    }
  }

  articles = dedupeNews(articles)

  // Sort: strict matches first, then by date descending
  articles.sort((a, b) => {
    if (a.strictMatch && !b.strictMatch) return -1
    if (!a.strictMatch && b.strictMatch) return 1
    return b.publishedAt - a.publishedAt
  })

  const finalArticles = articles.slice(0, Math.max(SCRAPER_MIN_POOL, ARTICLES_PER_CATEGORY))

  console.log(`Vietnam News scraper collected ${finalArticles.length} unique articles`)
  
  // Clean up strictMatch flag
  return finalArticles.map(a => {
    const { strictMatch, ...rest } = a
    return rest
  })
}
