import { scoreArticle } from '../utils/scorer.js'
import { rankAndSummarize } from './aiRanker.js'
import News from '../models/News.js'
import { ARTICLES_PER_CATEGORY } from '../constants/news.js'
import { fetchWorldNews } from './scrapers/worldNews/index.js'
import { fetchVietnamNews } from './scrapers/vietnamNews/index.js'
import { fetchJobs } from './scrapers/jobs.js'

const CATEGORIES = ['World News', 'Vietnam News', 'Jobs']

async function saveRankedArticles(topArticles, rankedResults, category) {
  const resultsToSave =
    rankedResults.length > 0
      ? rankedResults
      : topArticles.map((article, index) => ({
          index,
          reason: (article.summary || article.title || '').slice(0, 500),
        }))

  // Quantity is prioritized over pre-filtering: nothing is dropped here, admin review is the
  // actual relevance gate. AI-judged relevance (when available) only decides display order,
  // so the most on-topic articles surface first for the admin.
  resultsToSave.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))

  let savedCount = 0
  for (const result of resultsToSave) {
    const article = topArticles[result.index]
    if (!article) continue

    try {
      const exists = await News.findOne({ url: article.url })
      if (!exists) {
        await News.create({
          title: article.title,
          summary: result.reason,
          url: article.url,
          source: article.source,
          category: article.category,
          thumbnail: article.thumbnail || '',
          publishedAt: article.publishedAt,
          score: article.score,
          status: 'pending',
        })
        savedCount++
      }
    } catch (dbErr) {
      console.error(`[${category}] Error saving article:`, dbErr.message)
    }
  }
  return savedCount
}

export const fetchAndProcessNews = async () => {
  console.log('Starting IC Design News Agent...')
  const perCategoryStats = {}

  try {
    console.log('Fetching all sources...')
    const [worldNews, vietnamNews, jobs] = await Promise.all([
      fetchWorldNews(),
      fetchVietnamNews(),
      fetchJobs(),
    ])

    const rawArticles = [...worldNews, ...vietnamNews, ...jobs]
    console.log(`Fetched ${rawArticles.length} raw articles. Normalizing...`)

    const uniqueArticles = new Map()
    for (const article of rawArticles) {
      if (article.url && article.title && !uniqueArticles.has(article.url)) {
        uniqueArticles.set(article.url, article)
      }
    }

    let articles = Array.from(uniqueArticles.values())

    const urls = articles.map((a) => a.url)
    const existingNews = await News.find({ url: { $in: urls } }, 'url')
    const existingUrls = new Set(existingNews.map((n) => n.url))
    articles = articles.filter((a) => !existingUrls.has(a.url))

    console.log(`${articles.length} new articles after duplicate filter.`)

    articles.forEach((article) => {
      article.score = scoreArticle(article)
    })

    let totalSaved = 0

    for (const cat of CATEGORIES) {
      const catArticles = articles.filter((a) => a.category === cat)
      catArticles.sort((a, b) => b.score - a.score)
      const topPerCat = catArticles.slice(0, ARTICLES_PER_CATEGORY)

      if (topPerCat.length === 0) {
        console.warn(`[${cat}] No new articles found (target: ${ARTICLES_PER_CATEGORY})`)
        perCategoryStats[cat] = { scraped: 0, processed: 0, saved: 0 }
        continue
      }

      if (topPerCat.length < ARTICLES_PER_CATEGORY) {
        console.warn(
          `[${cat}] Only ${topPerCat.length}/${ARTICLES_PER_CATEGORY} new articles available`
        )
      }

      console.log(`[${cat}] Ranking and summarizing ${topPerCat.length} articles with AI...`)
      const rankedResults = await rankAndSummarize(topPerCat, cat)
      const savedCount = await saveRankedArticles(topPerCat, rankedResults, cat)

      perCategoryStats[cat] = {
        scraped: catArticles.length,
        processed: topPerCat.length,
        saved: savedCount,
      }
      totalSaved += savedCount
      console.log(`[${cat}] Saved ${savedCount} pending articles`)
    }

    if (totalSaved === 0 && articles.length === 0) {
      console.log('No new articles found across all categories.')
    } else {
      console.log(`Agent finished. Saved ${totalSaved} new pending articles.`, perCategoryStats)
    }

    // Explicit post-fetch cleanup to ensure overall database stays below 200 articles
    try {
      const count = await News.countDocuments()
      if (count > 200) {
        const excess = count - 200
        const oldest = await News.find({}, '_id').sort({ publishedAt: 1 }).limit(excess)
        const ids = oldest.map((o) => o._id)
        await News.deleteMany({ _id: { $in: ids } })
        console.log(`[News Cleanup] Fetch complete. Deleted ${excess} oldest articles to maintain 200 limit.`)
      }
    } catch (cleanupErr) {
      console.error('[News Cleanup] Failed to run database cleanup:', cleanupErr)
    }

    return { totalSaved, perCategoryStats }
  } catch (error) {
    console.error('Agent error:', error)
    throw error
  }
}
