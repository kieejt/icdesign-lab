import { hasKeyword } from './textMatch.js'

const KEYWORDS = [
  'vlsi', 'asic', 'fpga', 'chip', 'semiconductor', 'ic design', 'soc',
  'bán dẫn', 'vi mạch', 'chip bán dẫn',
]

/** True when the text mentions the topic by one of the whole-word keywords. */
export const matchesTopic = (text) => KEYWORDS.some((keyword) => hasKeyword(String(text || '').toLowerCase(), keyword))

export const scoreArticle = (article) => {
  let score = 0
  const title = (article.title || '').toLowerCase()
  const summary = (article.summary || '').toLowerCase()

  // 1. Keyword Relevance (whole-word match to avoid false positives, e.g. 'soc' inside "society")
  KEYWORDS.forEach((keyword) => {
    if (hasKeyword(title, keyword)) score += 3
    if (hasKeyword(summary, keyword)) score += 1
  })

  // The scrapers mark items from dedicated semiconductor feeds or keyword hits.
  // They used to be sorted first and cut to a fixed pool; with no cut any more,
  // the same preference is expressed as score.
  if (article.strictMatch) score += 2

  // 2. Source Priority
  const source = String(article.source || '').toLowerCase()
  if (source.includes('arxiv')) score += 2
  else if (source.includes('semiconductor engineering')) score += 3
  else if (source.includes('ee times')) score += 2
  else if (source.includes('techcrunch')) score += 1

  // 3. Recency
  const publishedAt = new Date(article.publishedAt)
  const daysOld = (Date.now() - publishedAt) / (1000 * 60 * 60 * 24)

  if (daysOld <= 1) score += 5
  else if (daysOld <= 3) score += 3
  else if (daysOld <= 7) score += 1

  return score
}
