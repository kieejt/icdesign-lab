import { Groq } from 'groq-sdk'

import { groqModel, reasoningParams } from '../constants/ai.js'

/** Characters of each article's text sent to the model. */
const SUMMARY_CHARS = 500

/** Summary length kept when the AI is unavailable or skipped an article. */
const FALLBACK_SUMMARY_CHARS = 500

const fallbackFor = (article, index) => ({
  index,
  reason: (article.summary || article.title || '').slice(0, FALLBACK_SUMMARY_CHARS),
  relevance: null,
})

/** Plain text of a feed snippet: tags and whitespace removed, then cut. */
const clip = (text = '', max = SUMMARY_CHARS) =>
  String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

export function buildPrompt(articles, category = '') {
  const n = articles.length
  const categoryLabel = category ? ` (category: ${category})` : ''

  return `You are an expert in IC Design, VLSI, and Semiconductors.
You are given exactly ${n} articles${categoryLabel}.

For EACH article:
1. Write an objective, direct summary of its content (2-3 sentences). Start with the subject itself;
   never begin with "The article", "This article" or "A job posting". Write the summary in the same
   language as the article's title (Vietnamese titles get Vietnamese summaries).
2. Score its "relevance" from 0 to 10: how related the article actually is to IC design, VLSI,
   semiconductors, the chip industry, or (for job listings) semiconductor/hardware engineering roles.
   0-2 means the article is off-topic (e.g. general politics, entertainment, sports, or a keyword
   match that turned out to be coincidental). 8-10 means it is squarely about chip design or the
   semiconductor industry. Be an honest judge — do not default to a high score.

Return ONE JSON object of this exact shape, with one entry for every index from 0 to ${n - 1}:
{"items":[{"index":0,"reason":"<summary for article 0>","relevance":<0-10>}, ...]}

Use only facts stated in the title and snippet. Some articles have just a headline: then say only what
the headline states and never add details, numbers or names that are not in it.

IMPORTANT: The "reason" field is shown to users as the news summary. Write pure factual summaries only.
DO NOT use phrases like "This article is relevant because..." or "Selected due to...".

Articles:
${articles.map((a, i) => `[${i}] Title: ${a.title}\nSource: ${a.source}\nSummary: ${clip(a.summary)}\n`).join('\n')}
`
}

/**
 * Turns the model's reply into one validated result per article.
 *
 * The reply is untrusted: an index can be missing, repeated or out of range, a
 * score can be a string or 40. Anything unusable is replaced by the fallback for
 * that article instead of being dropped, so an article the model skipped is still
 * saved (with its own snippet as the summary) rather than silently lost.
 *
 * @param {string} text raw model output
 * @param {object[]} articles the articles that were sent
 * @returns {{results: {index: number, reason: string, relevance: number|null}[], usedAi: boolean}}
 */
export function parseRanking(text, articles) {
  const fallback = () => ({ results: articles.map(fallbackFor), usedAi: false })

  let parsed
  try {
    const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return fallback()
  }

  const items = Array.isArray(parsed) ? parsed : parsed?.items
  if (!Array.isArray(items)) return fallback()

  const byIndex = new Map()
  for (const item of items) {
    const index = Number(item?.index)
    if (!Number.isInteger(index) || index < 0 || index >= articles.length || byIndex.has(index)) continue

    const reason = typeof item.reason === 'string' ? item.reason.trim().slice(0, 600) : ''
    const relevance = Number(item.relevance)
    byIndex.set(index, {
      index,
      reason: reason || fallbackFor(articles[index], index).reason,
      relevance: Number.isFinite(relevance) ? Math.min(10, Math.max(0, relevance)) : null,
    })
  }

  if (byIndex.size === 0) return fallback()

  return {
    results: articles.map((article, index) => byIndex.get(index) ?? fallbackFor(article, index)),
    usedAi: true,
  }
}

/**
 * Asks the model to summarise and judge every article.
 *
 * Always returns one result per article, in order, and never throws.
 *
 * @param {object[]} articles
 * @param {string} [category]
 * @param {{client?: {chat: {completions: {create: Function}}}}} [deps] injectable for tests
 * @returns {Promise<{results: object[], usedAi: boolean, error?: string}>}
 */
export const rankAndSummarize = async (articles, category = '', deps = {}) => {
  if (!articles.length) return { results: [], usedAi: false }

  if (!deps.client && !process.env.GROQ_API_KEY) {
    return { results: articles.map(fallbackFor), usedAi: false, error: 'GROQ_API_KEY is not set' }
  }

  // The SDK retries 429/5xx with backoff; the timeout keeps a hung request from
  // stalling the run.
  const client = deps.client ?? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 45_000, maxRetries: 2 })

  try {
    const model = groqModel()
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: buildPrompt(articles, category) }],
      model,
      ...reasoningParams(model),
      temperature: 0.2,
      // JSON mode: the model must emit a parseable object, which removes the
      // markdown-fence and trailing-prose failures of free-form output.
      response_format: { type: 'json_object' },
    })

    return parseRanking(completion.choices[0]?.message?.content, articles)
  } catch (error) {
    return { results: articles.map(fallbackFor), usedAi: false, error: error?.message || String(error) }
  }
}
