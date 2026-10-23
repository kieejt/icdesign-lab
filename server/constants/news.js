/** Target number of articles to process and save per category on each fetch run. */
export const ARTICLES_PER_CATEGORY = 5

/** Minimum raw articles each scraper should aim to collect before scoring. */
export const SCRAPER_MIN_POOL = 20

/** Setting key toggling whether high-scoring articles are auto-approved on fetch. */
export const AUTO_APPROVE_SETTING_KEY = 'news_auto_approve'

/** Minimum score an article needs to be auto-approved when the toggle is enabled. */
export const AUTO_APPROVE_SCORE_THRESHOLD = 7

/** Maximum articles kept in the collection; older ones are pruned after each fetch. */
export const NEWS_RETENTION_LIMIT = 200

/*
 * Selection. The agent used to rank only the five articles its keyword score put
 * first, so the AI could reorder them but never rescue a better one. It now judges
 * a wider shortlist and keeps the best by relevance.
 */

/** Articles per category sent to the AI for judgement. */
export const AI_CANDIDATES_PER_CATEGORY = 10

/** AI relevance (0-10) below this is treated as off-topic and not saved. */
export const MIN_AI_RELEVANCE_TO_SAVE = 3

/** Auto-approval needs the AI to agree the article is on topic, not just a high keyword score. */
export const AUTO_APPROVE_MIN_RELEVANCE = 7

/** How many of one category's slots a single source may take (see selectDiverse). */
export const MAX_PER_SOURCE = { Jobs: 2, default: 3 }

/** A run older than this is assumed to have crashed; also the news-fetch lease length. */
export const NEWS_JOB_TTL_MS = 15 * 60 * 1000

/** If no successful run is newer than this when the server starts, one is run to catch up. */
export const CATCH_UP_AFTER_MS = 26 * 60 * 60 * 1000

/**
 * Oldest an item may be, in days, before it is ignored. Feeds sometimes surface old
 * articles (a Vietnamese feed listed one from February of the previous year, and
 * its keywords gave it the top score) and job boards keep stale postings up.
 */
export const MAX_AGE_DAYS = { Jobs: 60, default: 14 }
