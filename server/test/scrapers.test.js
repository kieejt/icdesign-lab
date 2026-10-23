import assert from 'node:assert/strict'
import http from 'node:http'
import { test } from 'node:test'

import { jobFromHit } from '../services/scrapers/jobs/sources/vietnamworks.js'
import { parseCareerlinkJobs } from '../services/scrapers/jobs/sources/careerlink.js'
import { parseLinkedInCards } from '../services/scrapers/jobs/sources/linkedin.js'
import { buildJobArticle } from '../services/scrapers/jobs/utils.js'
import { extractCandidates, isBlockedPage } from '../services/scrapers/worldNews/sources/htmlScrapers.js'
import { get, mapLimit, withDeadline } from '../services/scrapers/http.js'
import { RunReport, trackSource } from '../services/runReport.js'

// These tests serve fixtures from 127.0.0.1, which the outbound guard refuses by default.
process.env.ALLOW_PRIVATE_FETCH = '1'

/* ----------------------------- parsers ---------------------------------- */

test('parseLinkedInCards reads title, company, link and the real posting date', () => {
  const html = `
    <ul>
      <li><div class="base-card">
        <a class="base-card__full-link" href="https://vn.linkedin.com/jobs/view/rtl-design-engineer-123?trk=abc"></a>
        <h3 class="base-search-card__title"> RTL Design Engineer </h3>
        <h4 class="base-search-card__subtitle">Acme Silicon</h4>
        <span class="job-search-card__location">Hanoi</span>
        <time class="job-search-card__listdate" datetime="2026-10-20">3 days ago</time>
      </div></li>
      <li><div class="base-card">
        <a class="base-card__full-link" href="https://vn.linkedin.com/jobs/view/barista-9"></a>
        <h3 class="base-search-card__title">Barista</h3>
        <h4 class="base-search-card__subtitle">Coffee Co</h4>
      </div></li>
    </ul>`
  const jobs = parseLinkedInCards(html)
  assert.equal(jobs.length, 1, 'the irrelevant job is filtered out')
  assert.equal(jobs[0].title, 'RTL Design Engineer')
  assert.equal(jobs[0].summary, 'Acme Silicon · Hanoi')
  assert.equal(jobs[0].url, 'https://vn.linkedin.com/jobs/view/rtl-design-engineer-123', 'query string removed')
  assert.equal(jobs[0].publishedAt.toISOString().slice(0, 10), '2026-10-20', 'uses the card date, not "now"')
})

test('parseLinkedInCards falls back to now when the card has no date', () => {
  const html = `<div class="base-card"><a class="base-card__full-link" href="https://l.com/jobs/1"></a>
    <h3 class="base-search-card__title">FPGA Engineer</h3></div>`
  const [job] = parseLinkedInCards(html)
  assert.ok(Math.abs(Date.now() - job.publishedAt.getTime()) < 5000)
})

test('buildJobArticle never produces an Invalid Date', () => {
  const job = buildJobArticle({ title: 't', url: 'https://e.com/j', source: 'S', publishedAt: 'garbage' })
  assert.ok(!Number.isNaN(job.publishedAt.getTime()))
})

test('jobFromHit maps a VietnamWorks hit and keeps its approval date', () => {
  const job = jobFromHit({
    jobTitle: 'ASIC Verification Engineer',
    jobUrl: 'https://www.vietnamworks.com/asic-verification-1',
    companyName: 'Chipco',
    jobDescription: '<p>UVM and SystemVerilog</p>',
    approvedOn: '2026-10-16T16:22:34+07:00',
  })
  assert.equal(job.source, 'VietnamWorks')
  assert.match(job.summary, /^Chipco — /)
  assert.equal(job.publishedAt.toISOString(), '2026-10-16T09:22:34.000Z')
  assert.equal(jobFromHit({ jobTitle: 'Accountant', jobUrl: 'https://x/1', jobDescription: 'books' }), null)
  assert.equal(jobFromHit({ jobTitle: 'FPGA' }), null, 'a hit without a URL is unusable')
})

test('parseCareerlinkJobs keeps relevant listings only', () => {
  const html = `
    <a class="job-link" href="/viec-lam/fpga-engineer-1" title="FPGA Engineer"><span class="company-name">Acme</span></a>
    <a class="job-link" href="/viec-lam/cashier-2" title="Cashier"><span class="company-name">Shop</span></a>`
  const jobs = parseCareerlinkJobs(html)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].url, 'https://www.careerlink.vn/viec-lam/fpga-engineer-1')
})

test('extractCandidates takes headline-like links and caps them per page', () => {
  const links = Array.from({ length: 8 }, (_, i) => `<a href="/news/story-${i}">A sufficiently long headline about semiconductors number ${i}</a>`).join('')
  const found = extractCandidates(`<body>${links}<a href="/x">short</a></body>`, { name: 'Pages', url: 'https://site.com/topic/' })
  assert.equal(found.length, 4)
  assert.equal(found[0].url, 'https://site.com/news/story-0')
})

/* ------------------------------- http ------------------------------------ */

function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler).listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${s.address().port}` }))
  })
}

test('get retries a 503 and then succeeds', async () => {
  let calls = 0
  const { s, url } = await server((_, res) => {
    calls += 1
    res.statusCode = calls === 1 ? 503 : 200
    res.end('ok')
  })
  try {
    const res = await get(url, { responseType: 'text' }, { retries: 2, baseDelayMs: 5 })
    assert.equal(res.data, 'ok')
    assert.equal(calls, 2)
  } finally {
    s.close()
  }
})

test('get does not retry a 404', async () => {
  let calls = 0
  const { s, url } = await server((_, res) => {
    calls += 1
    res.statusCode = 404
    res.end()
  })
  try {
    await assert.rejects(get(url, {}, { retries: 3, baseDelayMs: 5 }))
    assert.equal(calls, 1)
  } finally {
    s.close()
  }
})

test('get gives up after the retry budget', async () => {
  let calls = 0
  const { s, url } = await server((_, res) => {
    calls += 1
    res.statusCode = 500
    res.end()
  })
  try {
    await assert.rejects(get(url, {}, { retries: 2, baseDelayMs: 5 }))
    assert.equal(calls, 3)
  } finally {
    s.close()
  }
})

test('mapLimit bounds concurrency, preserves order and survives a failing item', async () => {
  let running = 0
  let peak = 0
  const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
    running += 1
    peak = Math.max(peak, running)
    await new Promise((r) => setTimeout(r, 5))
    running -= 1
    if (n === 3) throw new Error('boom')
    return n * 10
  })
  assert.equal(peak, 2)
  assert.deepEqual(out.map((x) => (x instanceof Error ? 'err' : x)), [10, 20, 'err', 40, 50, 60])
})

test('withDeadline aborts the signal when the budget runs out', async () => {
  const aborted = await withDeadline(20, (signal) => new Promise((resolve) => signal.addEventListener('abort', () => resolve(true))))
  assert.equal(aborted, true)
})

/* ----------------------------- run report -------------------------------- */

test('trackSource records success, partial notes and failures without throwing', async () => {
  const ctx = { report: new RunReport() }
  assert.deepEqual(await trackSource(ctx, 'ok', async () => [1, 2]), [1, 2])
  await trackSource(ctx, 'noted', async (note) => {
    note('1 of 5 queries failed')
    return [1]
  })
  assert.deepEqual(await trackSource(ctx, 'bad', async () => { throw new Error('403') }), [])
  await trackSource(ctx, 'empty', async () => [])

  const byName = Object.fromEntries(ctx.report.sources.map((s) => [s.name, s]))
  assert.equal(byName.ok.count, 2)
  assert.match(byName.noted.error, /queries failed/)
  assert.equal(byName.bad.ok, false)
  assert.deepEqual(ctx.report.failed.map((s) => s.name), ['bad'])
  assert.deepEqual(ctx.report.empty.map((s) => s.name), ['empty'])
})

test('isBlockedPage recognises bot-protection pages served with status 200', () => {
  assert.equal(isBlockedPage('<html><head><title>Access denied</title></head>'), true)
  assert.equal(isBlockedPage('<title>Just a moment...</title>'), true)
  assert.equal(isBlockedPage('<title>Semiconductor news | Tom Hardware</title>'), false)
  assert.equal(isBlockedPage(''), false)
})
