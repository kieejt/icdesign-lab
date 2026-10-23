import { JOB_RELEVANCE_KEYWORDS } from '../../../constants/jobKeywords.js'

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
}

export function getBrowserHeaders(extra = {}) {
  return { ...DEFAULT_HEADERS, ...extra }
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isJobRelevant(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase()
  return JOB_RELEVANCE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))
}

/** A usable Date, or null — an unparseable string must not reach Mongoose as Invalid Date. */
function validDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildJobArticle({ title, summary, url, source, publishedAt, thumbnail }) {
  if (!title || !url) return null
  return {
    title: title.trim(),
    summary: (summary || title).trim().slice(0, 2000),
    url: url.split('?')[0],
    source,
    category: 'Jobs',
    publishedAt: validDate(publishedAt) ?? new Date(),
    thumbnail: thumbnail || '',
  }
}

export function dedupeJobs(articles) {
  const seen = new Set()
  return articles.filter((a) => {
    if (!a?.url || seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
