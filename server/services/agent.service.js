import {
  AI_CANDIDATES_PER_CATEGORY,
  AI_SHORTLIST_PER_CATEGORY,
  ARTICLES_PER_CATEGORY,
  AUTO_APPROVE_MIN_RELEVANCE,
  AUTO_APPROVE_SCORE_THRESHOLD,
  AUTO_APPROVE_SETTING_KEY,
  MAX_AGE_DAYS,
  MAX_PER_SOURCE,
  MIN_AI_RELEVANCE_TO_SAVE,
  NEWS_JOB_TTL_MS,
  NEWS_RETENTION_LIMIT,
} from '../constants/news.js'
import { invalidateCache } from '../middleware/cache.js'
import AuditLog from '../models/AuditLog.js'
import FetchRun from '../models/FetchRun.js'
import News from '../models/News.js'
import SeenUrl from '../models/SeenUrl.js'
import Setting from '../models/Setting.js'
import { canonicalUrl, dedupeArticles, selectDiverse } from '../utils/articleIdentity.js'
import { cleanText } from '../utils/html.js'
import { acquireJobLock, isJobRunning } from '../utils/jobLock.js'
import { matchesTopic, scoreArticle } from '../utils/scorer.js'
import { rankAndSummarize } from './aiRanker.js'
import { enrichArticles } from './enrich.js'
import { RunReport } from './runReport.js'
import { collectArticles } from './sources.js'

const CATEGORIES = ['World News', 'Vietnam News', 'Jobs']

/** Lock name for the news fetch. */
const NEWS_JOB = 'news-fetch'

const maxPerSource = (category) => MAX_PER_SOURCE[category] ?? MAX_PER_SOURCE.default

/* -------------------------------------------------------------------------- */
/* Pure steps — exported so they can be tested without a database or network   */
/* -------------------------------------------------------------------------- */

/** True when the item has a real date older than the category allows. Undated items pass. */
function isTooOld(item) {
  const published = new Date(item.publishedAt).getTime()
  if (Number.isNaN(published)) return false
  const limitDays = MAX_AGE_DAYS[item.category] ?? MAX_AGE_DAYS.default
  return Date.now() - published > limitDays * 24 * 3600 * 1000
}

/** Google News links are redirects; when the same story is also available directly, prefer that. */
const isGoogleLink = (article) => /(^|\.)news\.google\.com$/.test(new URL(article.url, 'https://x').hostname)

/** Sort key: score, minus a penalty for redirect links so a direct copy of the same story wins. */
const rankValue = (article) => article.score - (isGoogleLink(article) ? 1.5 : 0)

const byRank = (a, b) => rankValue(b) - rankValue(a) || new Date(b.publishedAt) - new Date(a.publishedAt)

/**
 * Cleans raw scraper output: drops items without a URL or title or that are too
 * old, rewrites URLs to canonical form, scores everything, and removes duplicates (same canonical URL,
 * or a near-identical title; for jobs, from the same company).
 *
 * Duplicates are removed *after* sorting by score, so the best-scored copy of a
 * story is the one that survives.
 *
 * @param {object[]} raw
 * @returns {object[]} unique articles, best score first
 */
export function prepareArticles(raw) {
  const articles = []

  for (const item of raw) {
    if (!item?.url || !item?.title) continue
    if (isTooOld(item)) continue
    const url = canonicalUrl(item.url)
    const article = { ...item, title: cleanText(item.title), summary: cleanText(item.summary), rawUrl: item.url, url }
    article.score = scoreArticle(article)
    articles.push(article)
  }

  // Newer first on equal score, so ties favour fresh items.
  articles.sort(byRank)

  // Grouped by hand: Object.groupBy needs Node 21 and the images run Node 20.
  const byCategory = new Map()
  for (const article of articles) {
    if (!byCategory.has(article.category)) byCategory.set(article.category, [])
    byCategory.get(article.category).push(article)
  }

  return [...byCategory.entries()]
    .flatMap(([category, list]) => dedupeArticles(list, { sameCompany: category === 'Jobs' }))
    .sort(byRank)
}

/**
 * Chooses what to keep from the AI's judgement of a shortlist.
 *
 * With AI: drop what it rates off-topic, order by its relevance (keyword score
 * breaks ties), cap per source. Without AI (no key, an error): fall back to the
 * keyword order, since there is nothing better to rank by.
 *
 * @param {object[]} candidates shortlist in score order
 * @param {{index: number, reason: string, relevance: number|null}[]} ranking one per candidate
 * @param {boolean} usedAi
 * @param {string} category
 * @returns {{chosen: object[], offTopic: object[]}}
 */
export function chooseArticles(candidates, ranking, usedAi, category) {
  const judged = candidates.map((article, index) => ({
    ...article,
    summaryText: ranking[index]?.reason ?? '',
    relevance: ranking[index]?.relevance ?? null,
  }))

  if (!usedAi) {
    return { chosen: selectDiverse(judged, ARTICLES_PER_CATEGORY, maxPerSource(category)), offTopic: [] }
  }

  const offTopic = judged.filter((a) => a.relevance !== null && a.relevance < MIN_AI_RELEVANCE_TO_SAVE)
  const eligible = judged
    .filter((a) => a.relevance === null || a.relevance >= MIN_AI_RELEVANCE_TO_SAVE)
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || b.score - a.score)

  return { chosen: selectDiverse(eligible, ARTICLES_PER_CATEGORY, maxPerSource(category)), offTopic }
}

/**
 * Whether an article may skip review. A high keyword score alone is not enough:
 * recency and source bonuses can reach the threshold for an off-topic story, so
 * the AI must also rate it relevant (or, with no AI, the title must name the topic).
 */
export function isAutoApprovable(article, autoApproveEnabled) {
  if (!autoApproveEnabled || article.score < AUTO_APPROVE_SCORE_THRESHOLD) return false
  if (article.relevance === null || article.relevance === undefined) return matchesTopic(article.title)
  return article.relevance >= AUTO_APPROVE_MIN_RELEVANCE
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

/** Articles whose URL (raw or canonical) we already have, or have handled before. */
async function dropKnown(articles) {
  if (articles.length === 0) return articles

  const urls = [...new Set(articles.flatMap((a) => [a.url, a.rawUrl]))]
  const canonical = articles.map((a) => a.url)

  const [inNews, seen] = await Promise.all([
    News.find({ url: { $in: urls } }, 'url').lean(),
    SeenUrl.find({ _id: { $in: canonical } }, '_id').lean(),
  ])

  const known = new Set([...inNews.map((n) => n.url), ...seen.map((s) => s._id)])
  return articles.filter((a) => !known.has(a.url) && !known.has(a.rawUrl))
}

async function markSeen(urls) {
  if (urls.length === 0) return
  try {
    await SeenUrl.insertMany(
      urls.map((url) => ({ _id: url })),
      { ordered: false },
    )
  } catch (error) {
    // Duplicates are expected (already remembered); anything else is only a missed
    // optimisation, never a reason to fail the run.
    if (error?.code !== 11000 && !error?.writeErrors) console.error('Could not record seen URLs:', error.message)
  }
}

async function saveArticles(chosen, autoApproveEnabled, category) {
  if (chosen.length === 0) return { savedCount: 0, autoApprovedCount: 0 }

  const docs = chosen.map((article) => ({
    title: article.title,
    summary: article.summaryText || (article.summary || article.title).slice(0, 500),
    url: article.url,
    source: article.source,
    category: article.category,
    thumbnail: article.thumbnail || '',
    publishedAt: article.publishedAt,
    score: article.score,
    relevance: article.relevance,
    status: isAutoApprovable(article, autoApproveEnabled) ? 'approved' : 'pending',
  }))
  const autoApprovedCount = docs.filter((doc) => doc.status === 'approved').length

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

/* -------------------------------------------------------------------------- */
/* One run                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Collects, selects and saves news for every category.
 *
 * @param {{collect?: Function, rank?: Function, enrich?: Function, report?: RunReport}} [deps]
 *   injectable for tests; production uses the real sources and the Groq ranker
 */
export const fetchAndProcessNews = async ({
  collect = collectArticles,
  rank = rankAndSummarize,
  enrich = enrichArticles,
  report = new RunReport(),
} = {}) => {
  const autoApproveSetting = await Setting.findOne({ key: AUTO_APPROVE_SETTING_KEY }).lean()
  const autoApproveEnabled = autoApproveSetting?.value === true

  const raw = await collect({ report })
  console.log(`Collected ${raw.length} raw articles from ${report.sources.length} sources.`)

  const unique = prepareArticles(raw)
  const articles = await dropKnown(unique)
  console.log(`${articles.length} new articles after de-duplication (${raw.length - articles.length} dropped).`)

  const perCategory = {}
  const ai = { used: 0, failed: 0, errors: [] }
  let totalSaved = 0
  let totalAutoApproved = 0

  for (const category of CATEGORIES) {
    const pool = articles.filter((a) => a.category === category)

    // Listing pages show headlines only. Fetch the article itself (description,
    // real date, image) for a slightly wider shortlist, then re-score: a story that
    // turns out to be old drops out, and the shortlist is cut to what the AI sees.
    // Wide enough that dropping the stale ones still leaves a full shortlist: topic
    // pages list older articles too, and their real dates are only known here.
    const wide = selectDiverse(pool, AI_SHORTLIST_PER_CATEGORY, Math.ceil(AI_SHORTLIST_PER_CATEGORY / 2))
    const detailed = (await enrich(wide))
      .map((article) => ({ ...article, score: scoreArticle(article) }))
      .filter((article) => !isTooOld(article))
      .sort(byRank)
    const candidates = selectDiverse(detailed, AI_CANDIDATES_PER_CATEGORY, Math.ceil(AI_CANDIDATES_PER_CATEGORY / 2))

    if (candidates.length === 0) {
      console.warn(`[${category}] No new articles found.`)
      perCategory[category] = { pool: 0, candidates: 0, saved: 0, autoApproved: 0, offTopic: 0, ai: false }
      continue
    }

    const { results, usedAi, error } = await rank(candidates, category)
    if (usedAi) ai.used += 1
    else {
      ai.failed += 1
      if (error) ai.errors.push(`${category}: ${error}`.slice(0, 200))
    }

    const { chosen, offTopic } = chooseArticles(candidates, results, usedAi, category)
    const { savedCount, autoApprovedCount } = await saveArticles(chosen, autoApproveEnabled, category)

    // Remember what was handled. Off-topic ones too: the AI already judged them, so
    // tomorrow's run should not pay to judge the same article again. Articles that
    // merely lost out on a slot are left alone; they may win one later.
    await markSeen([...chosen, ...offTopic].map((a) => a.url))

    perCategory[category] = {
      pool: pool.length,
      candidates: candidates.length,
      saved: savedCount,
      autoApproved: autoApprovedCount,
      offTopic: offTopic.length,
      ai: usedAi,
    }
    totalSaved += savedCount
    totalAutoApproved += autoApprovedCount
    console.log(`[${category}] ${savedCount} saved (${autoApprovedCount} auto-approved), ${offTopic.length} judged off-topic, AI ${usedAi ? 'on' : 'off'}.`)
  }

  if (totalAutoApproved > 0) {
    await AuditLog.create({
      adminEmail: 'system (auto-approve)',
      action: 'AUTO_APPROVE_NEWS',
      details: `Auto-approved ${totalAutoApproved} article(s) with score >= ${AUTO_APPROVE_SCORE_THRESHOLD} and AI relevance >= ${AUTO_APPROVE_MIN_RELEVANCE} on fetch.`,
    })
  }

  // One prune per run: the single place the retention cap is enforced.
  try {
    const deleted = await News.pruneToLimit(NEWS_RETENTION_LIMIT)
    if (deleted > 0) console.log(`[News Cleanup] Deleted ${deleted} oldest articles to maintain the ${NEWS_RETENTION_LIMIT} limit.`)
  } catch (cleanupErr) {
    console.error('[News Cleanup] Failed to run database cleanup:', cleanupErr)
  }

  return { totalSaved, perCategory, ai, report }
}

/** How a finished run is classified, from its source reports. */
export function runStatus(report, error) {
  if (error) return 'failed'
  if (report.sources.length > 0 && report.failed.length === report.sources.length) return 'failed'
  return report.failed.length > 0 ? 'partial' : 'ok'
}

/**
 * Starts the news fetch if no other process is running it, and returns at once.
 *
 * Both the daily cron and the admin console's button go through here. The lock
 * means several API instances with the same schedule, or an admin clicking while
 * the cron is mid-run, scrape and pay for the AI once.
 *
 * The work continues in the background: `done` resolves when it has finished and
 * never rejects. A full run takes minutes, far longer than an HTTP request or the
 * proxy in front of it will wait, so the admin console polls the run's status
 * rather than holding a request open.
 *
 * @param {string} [trigger] where the run came from: 'cron', 'admin', 'catch-up'
 * @param {object} [deps] sources and ranker, injectable for tests
 * @returns {Promise<{started: false} | {started: true, runId: string, done: Promise<object|null>}>}
 */
export const startNewsFetch = async (trigger = 'manual', deps = {}) => {
  const release = await acquireJobLock(NEWS_JOB, NEWS_JOB_TTL_MS)
  if (!release) {
    console.log(`News fetch skipped (trigger: ${trigger}) — already running elsewhere.`)
    return { started: false }
  }

  const run = await FetchRun.create({ trigger })
  console.log(`Starting the news fetch (trigger: ${trigger}, run ${run._id}).`)

  const done = (async () => {
    const report = new RunReport()
    let result = null
    let error = null

    try {
      result = await fetchAndProcessNews({ ...deps, report })
    } catch (err) {
      error = err
      console.error('News fetch failed:', err)
    }

    try {
      await FetchRun.updateOne(
        { _id: run._id },
        {
          status: runStatus(report, error),
          finishedAt: new Date(),
          sources: report.sources,
          perCategory: result?.perCategory ?? {},
          totalSaved: result?.totalSaved ?? 0,
          ai: result?.ai ?? {},
          ...(error ? { error: String(error.message || error).slice(0, 300) } : {}),
        },
      )
    } catch (err) {
      console.error('Could not store the fetch run:', err.message)
    }

    invalidateCache('news')
    await release()
    return result
  })()

  return { started: true, runId: String(run._id), done }
}

/**
 * Runs the news fetch and waits for it. Used by the scheduler.
 *
 * @returns {Promise<{ran: boolean, result?: object|null}>}
 */
export const runNewsFetch = async (trigger = 'manual') => {
  const started = await startNewsFetch(trigger)
  if (!started.started) return { ran: false }
  return { ran: true, result: await started.done }
}

/* -------------------------------------------------------------------------- */
/* Status for the admin console                                                */
/* -------------------------------------------------------------------------- */

/** Marks runs that never finished (the process died mid-run) as failed. */
export async function recoverStaleRuns() {
  const cutoff = new Date(Date.now() - NEWS_JOB_TTL_MS)
  await FetchRun.updateMany(
    { status: 'running', startedAt: { $lt: cutoff } },
    { status: 'failed', finishedAt: new Date(), error: 'interrupted before it finished' },
  )
}

/**
 * @returns {Promise<{running: boolean, current: object|null, last: object|null}>}
 *   `last` is the most recent finished run, `current` the one in progress
 */
export async function getFetchStatus() {
  const [running, current, last] = await Promise.all([
    isJobRunning(NEWS_JOB),
    FetchRun.findOne({ status: 'running' }).sort({ startedAt: -1 }).lean(),
    FetchRun.findOne({ status: { $ne: 'running' } }).sort({ startedAt: -1 }).lean(),
  ])
  return { running, current, last }
}

/** The most recent run that produced a usable result, or null. */
export async function lastSuccessfulRun() {
  return FetchRun.findOne({ status: { $in: ['ok', 'partial'] } }).sort({ startedAt: -1 }).lean()
}
