import assert from 'node:assert/strict'
import { test } from 'node:test'

import { canonicalUrl, dedupeArticles, jaccard, selectDiverse, titleTokens } from '../utils/articleIdentity.js'

test('canonicalUrl removes tracking parameters, fragments and trailing slashes', () => {
  assert.equal(
    canonicalUrl('http://Example.com/a/b/?utm_source=x&id=7&fbclid=abc#section'),
    'https://example.com/a/b?id=7',
  )
  assert.equal(canonicalUrl('https://example.com/'), 'https://example.com/')
})

test('canonicalUrl sorts the remaining parameters so order does not matter', () => {
  assert.equal(canonicalUrl('https://e.com/p?b=2&a=1'), canonicalUrl('https://e.com/p?a=1&b=2'))
})

test('canonicalUrl leaves non-URLs alone', () => {
  assert.equal(canonicalUrl('not a url'), 'not a url')
  assert.equal(canonicalUrl(''), '')
})

test('jaccard measures token overlap', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1)
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['c', 'd'])), 0)
  assert.equal(jaccard(new Set(), new Set(['a'])), 0)
})

test('titleTokens is Unicode-aware and ignores punctuation', () => {
  assert.deepEqual([...titleTokens('Chip bán dẫn: Việt Nam!')], ['chip', 'bán', 'dẫn', 'việt', 'nam'])
})

test('dedupeArticles drops the same URL with different tracking parameters', () => {
  const kept = dedupeArticles([
    { title: 'Story one about chips', url: 'https://e.com/a?utm_source=x' },
    { title: 'Totally different headline here', url: 'https://e.com/a?utm_source=y' },
  ])
  assert.equal(kept.length, 1)
})

test('dedupeArticles drops a reworded syndicated headline, keeping the first', () => {
  const kept = dedupeArticles([
    { title: 'TSMC to build new chip plant in Arizona', url: 'https://a.com/1' },
    { title: 'TSMC to build chip plant in Arizona', url: 'https://b.com/2' },
    { title: 'Intel reports quarterly earnings', url: 'https://c.com/3' },
  ])
  assert.deepEqual(kept.map((a) => a.url), ['https://a.com/1', 'https://c.com/3'])
})

test('dedupeArticles treats identical job titles from different companies as different jobs', () => {
  const jobs = [
    { title: 'FPGA Engineer', url: 'https://l.com/1', summary: 'Acme · Hanoi' },
    { title: 'FPGA Engineer', url: 'https://l.com/2', summary: 'Globex · Hanoi' },
    { title: 'FPGA Engineer', url: 'https://c.com/3', summary: 'Acme — Careerlink' },
  ]
  const kept = dedupeArticles(jobs, { sameCompany: true })
  assert.deepEqual(kept.map((j) => j.url), ['https://l.com/1', 'https://l.com/2'])
})

test('dedupeArticles skips items without a url or title', () => {
  assert.equal(dedupeArticles([{ title: 'x' }, { url: 'https://e.com' }, null]).length, 0)
})

test('selectDiverse caps one source, then fills remaining slots with the best of the rest', () => {
  const list = [
    ...['a', 'b', 'c', 'd'].map((id) => ({ id, source: 'LinkedIn' })),
    { id: 'e', source: 'VietnamWorks' },
    { id: 'f', source: 'Careerlink' },
  ]
  assert.deepEqual(selectDiverse(list, 5, 2).map((x) => x.id), ['a', 'b', 'e', 'f', 'c'])
  // With a cap that cannot fill the slots, skipped items still get used.
  assert.deepEqual(selectDiverse(list.slice(0, 4), 3, 1).map((x) => x.id), ['a', 'b', 'c'])
})
