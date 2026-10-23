import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildPrompt, parseRanking, rankAndSummarize } from '../services/aiRanker.js'

const articles = [
  { title: 'A', source: 'S', summary: 'snippet a' },
  { title: 'B', source: 'S', summary: 'snippet b' },
  { title: 'C', source: 'S', summary: 'snippet c' },
]

test('parseRanking accepts the JSON-mode object shape', () => {
  const { results, usedAi } = parseRanking(
    JSON.stringify({ items: [{ index: 0, reason: 'ra', relevance: 9 }, { index: 1, reason: 'rb', relevance: 2 }, { index: 2, reason: 'rc', relevance: 5 }] }),
    articles,
  )
  assert.equal(usedAi, true)
  assert.deepEqual(results.map((r) => r.relevance), [9, 2, 5])
})

test('parseRanking tolerates a bare array and markdown fences', () => {
  const text = '```json\n[{"index":0,"reason":"x","relevance":7}]\n```'
  const { results, usedAi } = parseRanking(text, articles)
  assert.equal(usedAi, true)
  assert.equal(results[0].relevance, 7)
})

test('parseRanking keeps articles the model skipped, using their own snippet', () => {
  const { results } = parseRanking(JSON.stringify({ items: [{ index: 1, reason: 'only b', relevance: 8 }] }), articles)
  assert.equal(results.length, 3)
  assert.equal(results[0].reason, 'snippet a')
  assert.equal(results[0].relevance, null)
  assert.equal(results[1].reason, 'only b')
})

test('parseRanking ignores out-of-range and repeated indexes and clamps scores', () => {
  const { results } = parseRanking(
    JSON.stringify({
      items: [
        { index: 0, reason: 'first', relevance: 40 },
        { index: 0, reason: 'repeat', relevance: 1 },
        { index: 9, reason: 'nope', relevance: 5 },
        { index: 1, reason: 'b', relevance: '6' },
        { index: 2, reason: 'c', relevance: 'high' },
      ],
    }),
    articles,
  )
  assert.equal(results[0].reason, 'first')
  assert.equal(results[0].relevance, 10)
  assert.equal(results[1].relevance, 6)
  assert.equal(results[2].relevance, null)
})

test('parseRanking falls back entirely on junk', () => {
  for (const text of ['', 'not json', '{"items":"x"}', '[]', '{"other":1}']) {
    const { results, usedAi } = parseRanking(text, articles)
    assert.equal(usedAi, false, text)
    assert.equal(results.length, 3)
    assert.ok(results.every((r) => r.relevance === null))
  }
})

test('buildPrompt truncates long snippets and strips markup to save tokens', () => {
  const long = [{ title: 'T', source: 'S', summary: `<p>${'filler '.repeat(400)}</p>` }]
  const prompt = buildPrompt(long, 'Jobs')
  assert.ok(!prompt.includes('<p>'))
  // 500 characters of "filler " is at most 84 words, however long the source was.
  assert.ok((prompt.match(/filler/g) || []).length <= 84)
})

test('rankAndSummarize returns one validated result per article from the model reply', async () => {
  const client = {
    chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"items":[{"index":0,"reason":"r","relevance":8}]}' } }] }) } },
  }
  const { results, usedAi } = await rankAndSummarize(articles, 'World News', { client })
  assert.equal(usedAi, true)
  assert.equal(results.length, 3)
})

test('rankAndSummarize never throws: a failing API yields fallbacks and the error', async () => {
  const client = { chat: { completions: { create: async () => { throw new Error('429 rate limited') } } } }
  const { results, usedAi, error } = await rankAndSummarize(articles, 'World News', { client })
  assert.equal(usedAi, false)
  assert.equal(results.length, 3)
  assert.match(error, /429/)
})

test('rankAndSummarize without a key falls back and says why', async () => {
  const saved = process.env.GROQ_API_KEY
  delete process.env.GROQ_API_KEY
  try {
    const { usedAi, error } = await rankAndSummarize(articles, 'x')
    assert.equal(usedAi, false)
    assert.match(error, /GROQ_API_KEY/)
  } finally {
    if (saved !== undefined) process.env.GROQ_API_KEY = saved
  }
})
