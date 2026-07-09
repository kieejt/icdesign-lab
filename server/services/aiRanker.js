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

For EACH article:
1. Write an objective, direct summary of its content (2-3 sentences).
2. Score its "relevance" from 0 to 10: how related the article actually is to IC design, VLSI,
   semiconductors, the chip industry, or (for job listings) semiconductor/hardware engineering roles.
   0-2 means the article is off-topic (e.g. general politics, entertainment, sports, or a keyword
   match that turned out to be coincidental). 8-10 means it is squarely about chip design or the
   semiconductor industry. Be an honest judge — do not default to a high score.

You MUST return a JSON array with EXACTLY ${n} objects — one for every article index from 0 to ${n - 1}.
Do not skip any index. Do not add extra entries.

IMPORTANT: The "reason" field is shown to users as the news summary. Write pure factual summaries only.
DO NOT use phrases like "This article is relevant because..." or "Selected due to...".

DO NOT wrap the response in markdown. Output must be directly parseable by JSON.parse().

Expected JSON format:
[
  { "index": 0, "reason": "<summary for article 0>", "relevance": <0-10> },
  ...
  { "index": ${n - 1}, "reason": "<summary for article ${n - 1}>", "relevance": <0-10> }
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
