import { Groq } from 'groq-sdk'

export const rankAndSummarize = async (articles, category = '') => {
  if (!articles.length) return []

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is missing.')
    return articles.map((article, index) => ({
      index,
      reason: (article.summary || article.title || '').slice(0, 500),
    }))
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const n = articles.length
  const categoryLabel = category ? ` (category: ${category})` : ''

  const prompt = `You are an expert in IC Design, VLSI, and Semiconductors.
You are given exactly ${n} articles${categoryLabel}.
Write an objective, direct summary of each article's content (2-3 sentences per article).

You MUST return a JSON array with EXACTLY ${n} objects — one for every article index from 0 to ${n - 1}.
Do not skip any index. Do not add extra entries.

IMPORTANT: The "reason" field is shown to users as the news summary. Write pure factual summaries only.
DO NOT use phrases like "This article is relevant because..." or "Selected due to...".

DO NOT wrap the response in markdown. Output must be directly parseable by JSON.parse().

Expected JSON format:
[
  { "index": 0, "reason": "<summary for article 0>" },
  ...
  { "index": ${n - 1}, "reason": "<summary for article ${n - 1}>" }
]

Articles:
${articles.map((a, i) => `[${i}] Title: ${a.title}\nSource: ${a.source}\nSummary: ${a.summary}\n`).join('\n')}
`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    })

    let responseText = completion.choices[0]?.message?.content || ''

    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(json)?\n?/, '').replace(/```$/, '')
    }

    const parsed = JSON.parse(responseText.trim())
    if (!Array.isArray(parsed)) return []

    return parsed
  } catch (error) {
    console.error(`Error generating AI summaries${categoryLabel}:`, error)
    return articles.map((article, index) => ({
      index,
      reason: (article.summary || article.title || '').slice(0, 500),
    }))
  }
}
