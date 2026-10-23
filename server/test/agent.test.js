import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import mongoose from 'mongoose'

import { chooseArticles, fetchAndProcessNews, isAutoApprovable, prepareArticles, runStatus, startNewsFetch } from '../services/agent.service.js'
import { RunReport } from '../services/runReport.js'
import FetchRun from '../models/FetchRun.js'
import News from '../models/News.js'
import SeenUrl from '../models/SeenUrl.js'
import Setting from '../models/Setting.js'
import { AUTO_APPROVE_SETTING_KEY } from '../constants/news.js'

const now = Date.now()
const ago = (hours) => new Date(now - hours * 3600_000)

const article = (over) => ({
  title: 'Chip design news',
  summary: 'about semiconductor chip design',
  url: `https://example.com/${Math.random().toString(36).slice(2)}`,
  source: 'Src',
  category: 'World News',
  publishedAt: ago(2),
  ...over,
})

/* ------------------------------ pure steps -------------------------------- */

test('prepareArticles canonicalises, scores, and removes duplicates keeping the best-scored copy', () => {
  const out = prepareArticles([
    article({ title: 'Generic tech story today', summary: '', url: 'https://a.com/x?utm_source=feed', source: 'Other' }),
    article({ title: 'Semiconductor chip fab expands', url: 'https://a.com/x', source: 'Semiconductor Engineering' }),
    article({ title: '', url: 'https://a.com/empty' }),
  ])
  assert.equal(out.length, 1, 'same canonical URL collapses to one')
  assert.equal(out[0].source, 'Semiconductor Engineering', 'the higher-scored copy survives')
  assert.equal(out[0].url, 'https://a.com/x')
  assert.equal(typeof out[0].score, 'number')
})

test('prepareArticles keeps same-title jobs from different companies, drops same-company repeats', () => {
  const jobs = prepareArticles([
    article({ category: 'Jobs', title: 'FPGA Engineer', summary: 'Acme · Hanoi', url: 'https://l.com/1', source: 'LinkedIn' }),
    article({ category: 'Jobs', title: 'FPGA Engineer', summary: 'Globex · HCMC', url: 'https://l.com/2', source: 'LinkedIn' }),
    article({ category: 'Jobs', title: 'FPGA Engineer', summary: 'Acme — Careerlink', url: 'https://c.com/3', source: 'Careerlink' }),
  ])
  assert.equal(jobs.length, 2)
})

test('prepareArticles ignores items older than the category allows, keeps undated ones', () => {
  const day = 24
  const out = prepareArticles([
    article({ title: 'Fresh chip news', url: 'https://a.com/new', publishedAt: ago(5 * day) }),
    article({ title: 'Ancient chip news from last year', url: 'https://a.com/old', publishedAt: ago(400 * day) }),
    article({ title: 'Undated chip news', url: 'https://a.com/undated', publishedAt: undefined }),
    article({ category: 'Jobs', title: 'Six week old FPGA job', url: 'https://j.com/1', summary: 'Acme · Hanoi', publishedAt: ago(40 * day) }),
    article({ category: 'Jobs', title: 'Stale FPGA job', url: 'https://j.com/2', summary: 'Globex · Hanoi', publishedAt: ago(90 * day) }),
  ])
  assert.deepEqual(out.map((a) => a.url).sort(), ['https://a.com/new', 'https://a.com/undated', 'https://j.com/1'])
})

describe('chooseArticles', () => {
  const candidates = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => article({ title: id, url: `https://e.com/${id}`, source: `S${i % 4}`, score: 10 - i }))

  test('with AI: drops off-topic, orders by relevance, keeps at most five', () => {
    const ranking = candidates.map((_, i) => ({ index: i, reason: `r${i}`, relevance: [1, 9, 2, 8, 7, 6, 5][i] }))
    const { chosen, offTopic } = chooseArticles(candidates, ranking, true, 'World News')
    assert.deepEqual(offTopic.map((a) => a.title), ['a', 'c'])
    assert.deepEqual(chosen.map((a) => a.title), ['b', 'd', 'e', 'f', 'g'])
    assert.equal(chosen[0].summaryText, 'r1')
  })

  test('without AI: falls back to the keyword order and drops nothing', () => {
    const ranking = candidates.map((_, i) => ({ index: i, reason: `r${i}`, relevance: null }))
    const { chosen, offTopic } = chooseArticles(candidates, ranking, false, 'World News')
    assert.deepEqual(chosen.map((a) => a.title), ['a', 'b', 'c', 'd', 'e'])
    assert.equal(offTopic.length, 0)
  })
})

test('isAutoApprovable needs the AI to agree, not just a high keyword score', () => {
  const base = { score: 9, title: 'Generic news' }
  assert.equal(isAutoApprovable({ ...base, relevance: 8 }, true), true)
  assert.equal(isAutoApprovable({ ...base, relevance: 4 }, true), false, 'high score but the AI says marginal')
  assert.equal(isAutoApprovable({ ...base, relevance: 8 }, false), false, 'toggle off')
  assert.equal(isAutoApprovable({ ...base, score: 3, relevance: 9 }, true), false, 'score below threshold')
  assert.equal(isAutoApprovable({ ...base, relevance: null }, true), false, 'no AI and no topic keyword in the title')
  assert.equal(isAutoApprovable({ ...base, title: 'New FPGA released', relevance: null }, true), true)
})

test('runStatus classifies a run from its sources', () => {
  const report = new RunReport()
  report.addSource({ name: 'a', ok: true, count: 3 })
  assert.equal(runStatus(report), 'ok')
  report.addSource({ name: 'b', ok: false, error: 'x' })
  assert.equal(runStatus(report), 'partial')
  const dead = new RunReport()
  dead.addSource({ name: 'a', ok: false })
  assert.equal(runStatus(dead), 'failed')
  assert.equal(runStatus(report, new Error('boom')), 'failed')
})

/* ----------------------- end to end (needs MongoDB) ----------------------- */

const MONGO = process.env.MONGO_URI
describe('fetchAndProcessNews against MongoDB', { skip: MONGO ? false : 'MONGO_URI is not set' }, () => {
  before(async () => {
    await mongoose.connect(MONGO, { dbName: `agent_test_${process.pid}_${Date.now()}` })
  })
  after(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  })

  const fakeRank = (relevanceByTitle) => async (candidates) => ({
    usedAi: true,
    results: candidates.map((c, index) => ({ index, reason: `summary of ${c.title}`, relevance: relevanceByTitle[c.title] ?? 6 })),
  })

  test('saves the best by AI relevance, remembers off-topic items, and never resurrects them', async () => {
    await Promise.all([News.deleteMany({}), SeenUrl.deleteMany({})])

    const items = [
      article({ title: 'On topic chip story', url: 'https://x.com/1?utm_source=a', category: 'World News' }),
      article({ title: 'Celebrity gossip', url: 'https://x.com/2', category: 'World News' }),
      article({ title: 'Vietnam builds fab', url: 'https://x.com/3', category: 'Vietnam News' }),
    ]
    const collect = async () => items
    const rank = fakeRank({ 'On topic chip story': 9, 'Celebrity gossip': 1 })

    const first = await fetchAndProcessNews({ collect, rank })
    const saved = await News.find().lean()
    assert.deepEqual(saved.map((n) => n.title).sort(), ['On topic chip story', 'Vietnam builds fab'])
    assert.equal(saved.find((n) => n.title === 'On topic chip story').url, 'https://x.com/1', 'stored in canonical form')
    assert.equal(saved.find((n) => n.title === 'On topic chip story').relevance, 9)
    assert.equal(first.perCategory['World News'].offTopic, 1)

    // The off-topic item was handled, so it is remembered even though it was not saved.
    assert.equal(await SeenUrl.countDocuments({ _id: 'https://x.com/2' }), 1)

    // Same feed again, even after the news rows are gone (retention prune, admin delete).
    await News.deleteMany({})
    const second = await fetchAndProcessNews({ collect, rank })
    assert.equal(second.totalSaved, 0, 'nothing is re-saved or re-judged')
  })

  test('keeps saving when the AI is down, using each article snippet as the summary', async () => {
    await Promise.all([News.deleteMany({}), SeenUrl.deleteMany({})])
    const collect = async () => [article({ title: 'Snippet only', summary: 'raw feed snippet', url: 'https://y.com/1' })]
    const rank = async (candidates) => ({ usedAi: false, error: 'rate limited', results: candidates.map((c, index) => ({ index, reason: c.summary, relevance: null })) })

    const result = await fetchAndProcessNews({ collect, rank })
    assert.equal(result.totalSaved, 1)
    assert.equal(result.ai.failed >= 1, true)
    assert.match(result.ai.errors[0], /rate limited/)
    const [doc] = await News.find().lean()
    assert.equal(doc.summary, 'raw feed snippet')
    assert.equal(doc.relevance, null)
  })

  test('auto-approves only when enabled and the AI agrees', async () => {
    await Promise.all([News.deleteMany({}), SeenUrl.deleteMany({}), Setting.deleteMany({})])
    await Setting.create({ key: AUTO_APPROVE_SETTING_KEY, value: true })

    const collect = async () => [
      article({ title: 'Semiconductor chip fab breakthrough', url: 'https://z.com/1', source: 'Semiconductor Engineering' }),
      article({ title: 'Semiconductor chip stock gossip', url: 'https://z.com/2', source: 'Semiconductor Engineering' }),
    ]
    const rank = fakeRank({ 'Semiconductor chip fab breakthrough': 9, 'Semiconductor chip stock gossip': 4 })

    await fetchAndProcessNews({ collect, rank })
    const byTitle = Object.fromEntries((await News.find().lean()).map((n) => [n.title, n.status]))
    assert.equal(byTitle['Semiconductor chip fab breakthrough'], 'approved')
    assert.equal(byTitle['Semiconductor chip stock gossip'], 'pending')
  })

  test('a source that throws is reported and does not stop the run', async () => {
    await Promise.all([News.deleteMany({}), SeenUrl.deleteMany({})])
    const report = new RunReport()
    const collect = async ({ report: r }) => {
      r.addSource({ name: 'Broken feed', ok: false, error: '403' })
      r.addSource({ name: 'Good feed', ok: true, count: 1 })
      return [article({ title: 'Still works', url: 'https://w.com/1' })]
    }
    const result = await fetchAndProcessNews({ collect, rank: fakeRank({}), report })
    assert.equal(result.totalSaved, 1)
    assert.equal(runStatus(report), 'partial')
  })

  test('startNewsFetch answers at once and refuses a second concurrent run', async () => {
    await Promise.all([FetchRun.deleteMany({}), News.deleteMany({})])
    // Sources and ranker are faked: the test must never touch the network.
    let release
    const gate = new Promise((resolve) => { release = resolve })
    const deps = { collect: async () => { await gate; return [] }, rank: fakeRank({}) }

    const first = await startNewsFetch('test', deps)
    assert.equal(first.started, true)
    const second = await startNewsFetch('test', deps)
    assert.equal(second.started, false, 'the lock is held while the first run is in flight')
    release()
    await first.done
    const [run] = await FetchRun.find().lean()
    assert.ok(['ok', 'partial', 'failed'].includes(run.status))
    assert.ok(run.finishedAt)
  })
})
