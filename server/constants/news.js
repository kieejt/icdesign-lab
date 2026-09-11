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
