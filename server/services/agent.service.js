import { scoreArticle } from '../utils/scorer.js'
import { rankAndSummarize } from './aiRanker.js'
import News from '../models/News.js'
import Setting from '../models/Setting.js'
import AuditLog from '../models/AuditLog.js'
import {
  ARTICLES_PER_CATEGORY,
  AUTO_APPROVE_SETTING_KEY,
  AUTO_APPROVE_SCORE_THRESHOLD,
  NEWS_RETENTION_LIMIT,
} from '../constants/news.js'
import { fetchWorldNews } from './scrapers/worldNews/index.js'
import { fetchVietnamNews } from './scrapers/vietnamNews/index.js'
import { fetchJobs } from './scrapers/jobs.js'
import { withJobLock } from '../utils/jobLock.js'

const CATEGORIES = ['World News', 'Vietnam News', 'Jobs']

/** Lock name and lease length for the news fetch. */
const NEWS_JOB = 'news-fetch'

/*
 * A full run scrapes every source and makes one AI call per category. Fifteen
 * minutes is comfortably longer than that, and short enough that a crashed run
 * does not block the next day's fetch.
 */
const NEWS_JOB_TTL_MS = 15 * 60 * 1000

async function saveRankedArticles(topArticles, rankedResults, category, autoApproveEnabled) {
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

  const candidates = resultsToSave
    .map((result) => ({ result, article: topArticles[result.index] }))
    .filter(({ article }) => Boolean(article))

  if (candidates.length === 0) return { savedCount: 0, autoApprovedCount: 0 }

  // One indexed query for the whole batch instead of a findOne per article.
  const existing = await News.find(
    { url: { $in: candidates.map(({ article }) => article.url) } },
    'url',
  ).lean()
  const existingUrls = new Set(existing.map((n) => n.url))

  const docs = []
  let autoApprovedCount = 0

  for (const { result, article } of candidates) {
    if (existingUrls.has(article.url)) continue
    // Guard against the same url appearing twice within one batch.
    existingUrls.add(article.url)

    const shouldAutoApprove = autoApproveEnabled && article.score >= AUTO_APPROVE_SCORE_THRESHOLD
    if (shouldAutoApprove) autoApprovedCount++

    docs.push({
      title: article.title,
      summary: result.reason,
      url: article.url,
      source: article.source,
      category: article.category,
      thumbnail: article.thumbnail || '',
      publishedAt: article.publishedAt,
      score: article.score,
      status: shouldAutoApprove ? 'approved' : 'pending',
    })
  }

  if (docs.length === 0) return { savedCount: 0, autoApprovedCount: 0 }

  try {
    // `ordered: false` keeps going past a duplicate-url collision with a
    // concurrent run instead of abandoning the rest of the batch.
    const inserted = await News.insertMany(docs, { ordered: false })
    return { savedCount: inserted.length, autoApprovedCount }
  } catch (dbErr) {
    const inserted = dbErr.insertedDocs?.length ?? dbErr.result?.insertedCount ?? 0
    console.error(`[${category}] Partial save (${inserted}/${docs.length}):`, dbErr.message)
    return { savedCount: inserted, autoApprovedCount }
  }
}

export const fetchAndProcessNews = async () => {
  console.log('Starting IC Design News Agent...')
  const perCategoryStats = {}

  try {
    const autoApproveSetting = await Setting.findOne({ key: AUTO_APPROVE_SETTING_KEY })
    const autoApproveEnabled = autoApproveSetting?.value === true

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
    const existingNews = await News.find({ url: { $in: urls } }, 'url').lean()
    const existingUrls = new Set(existingNews.map((n) => n.url))
    articles = articles.filter((a) => !existingUrls.has(a.url))

    console.log(`${articles.length} new articles after duplicate filter.`)

    articles.forEach((article) => {
      article.score = scoreArticle(article)
    })

    let totalSaved = 0
    let totalAutoApproved = 0

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
      const { savedCount, autoApprovedCount } = await saveRankedArticles(
        topPerCat,
        rankedResults,
        cat,
        autoApproveEnabled
      )

      perCategoryStats[cat] = {
        scraped: catArticles.length,
        processed: topPerCat.length,
        saved: savedCount,
      }
      totalSaved += savedCount
      totalAutoApproved += autoApprovedCount
      console.log(`[${cat}] Saved ${savedCount} pending articles (${autoApprovedCount} auto-approved)`)
    }

    if (totalSaved === 0 && articles.length === 0) {
      console.log('No new articles found across all categories.')
    } else {
      console.log(`Agent finished. Saved ${totalSaved} new pending articles.`, perCategoryStats)
    }

    if (totalAutoApproved > 0) {
      await AuditLog.create({
        adminEmail: 'system (auto-approve)',
        action: 'AUTO_APPROVE_NEWS',
        details: `Auto-approved ${totalAutoApproved} article(s) with score >= ${AUTO_APPROVE_SCORE_THRESHOLD} on fetch.`,
      })
    }

    // One prune per fetch run. This used to also happen inside a post('save')
    // hook, meaning a full countDocuments() for every article written; the hook
    // is gone and this is now the single place the 200-article cap is enforced.
    try {
      const deleted = await News.pruneToLimit(NEWS_RETENTION_LIMIT)
      if (deleted > 0) {
        console.log(`[News Cleanup] Deleted ${deleted} oldest articles to maintain the ${NEWS_RETENTION_LIMIT} limit.`)
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

/**
 * Runs the news fetch, but only in one process at a time.
 *
 * Both the daily cron and the admin console's "fetch now" button go through
 * here. Without the lock, several API instances firing the same schedule — or an
 * admin clicking while the cron is mid-run — would each scrape everything and
 * each pay for its own AI summarisation.
 *
 * @param {string} [trigger] where the run came from, for the log line
 * @returns {Promise<{ran: boolean, result?: object}>}
 */
export const runNewsFetch = async (trigger = 'manual') => {
  const outcome = await withJobLock(NEWS_JOB, NEWS_JOB_TTL_MS, () => {
    console.log(`Starting the news fetch (trigger: ${trigger}).`)
    return fetchAndProcessNews()
  })

  if (!outcome.ran) {
    console.log(`News fetch skipped (trigger: ${trigger}) — already running elsewhere.`)
  }

  return outcome
}
