import assert from 'node:assert/strict'
import http from 'node:http'
import { test } from 'node:test'

import { enrichArticles, parseArticlePage } from '../services/enrich.js'
import { bingItemToArticle, googleItemToArticle } from '../services/scrapers/aggregators.js'
import { parseCareerVietJobs, parseUpdatedDate } from '../services/scrapers/jobs/sources/careerviet.js'
import { jobFromPosting, parsePostedOn } from '../services/scrapers/jobs/sources/workday.js'
import { extractListing } from '../services/scrapers/vietnamNews/sources/htmlListings.js'
import { prepareArticles } from '../services/agent.service.js'
import { cleanText } from '../utils/html.js'

/* ------------------------------ text -------------------------------------- */

test('cleanText decodes the entities some Vietnamese feeds leave in titles', () => {
  assert.equal(cleanText('Smartphone Trung Quốc t&igrave;m nguồn cung DRAM t&aacute;i chế'), 'Smartphone Trung Quốc tìm nguồn cung DRAM tái chế')
  assert.equal(cleanText('<p>Hello &amp; <b>world</b></p>\n  again'), 'Hello & world again')
  assert.equal(cleanText(undefined), '')
})

/* ---------------------------- aggregators --------------------------------- */

test('googleItemToArticle takes the publisher from the source tag and strips the title suffix', () => {
  const article = googleItemToArticle(
    { title: 'Khủng hoảng heli bủa vây ngành chip và bán dẫn - VnExpress', link: 'https://news.google.com/rss/articles/CBMi123?oc=5', source: { _: 'VnExpress' }, isoDate: '2026-10-20T01:00:00Z' },
    { category: 'Vietnam News' },
  )
  assert.equal(article.title, 'Khủng hoảng heli bủa vây ngành chip và bán dẫn')
  assert.equal(article.source, 'VnExpress')
  assert.equal(article.category, 'Vietnam News')
  assert.equal(article.summary, '', 'a headline-only result has no snippet')
  assert.equal(article.publishedAt.toISOString(), '2026-10-20T01:00:00.000Z')
})

test('googleItemToArticle falls back to the " - Publisher" suffix when there is no source tag', () => {
  const article = googleItemToArticle({ title: 'TSMC posts record quarter - Reuters', link: 'https://news.google.com/x' }, { category: 'World News' })
  assert.equal(article.source, 'Reuters')
  assert.equal(article.title, 'TSMC posts record quarter')
})

test('bingItemToArticle unwraps the real URL from the click-tracker and keeps the snippet', () => {
  const article = bingItemToArticle(
    { title: 'TP.HCM mở xưởng thực hành bán dẫn', link: 'http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&url=https%3a%2f%2ftuoitre.vn%2fxuong-ban-dan-123.htm&c=1', contentSnippet: 'Với 13 mô-đun thiết bị Intel trao tặng…', 'News:Source': 'Tuổi Trẻ' },
    { category: 'Vietnam News' },
  )
  assert.equal(article.url, 'https://tuoitre.vn/xuong-ban-dan-123.htm')
  assert.equal(article.source, 'Tuổi Trẻ')
  assert.match(article.summary, /^Với 13 mô-đun/)
})

/* ------------------------------ listings ---------------------------------- */

const LISTING = { name: 'Tuổi Trẻ · bán dẫn', publisher: 'Tuổi Trẻ', url: 'https://tuoitre.vn/ban-dan.html', hrefPattern: /-\d{14,}\.htm$/ }

test('extractListing keeps article links, drops navigation, other hosts and duplicates, and caps the count', () => {
  const articles = Array.from({ length: 15 }, (_, i) => `<a href="/xuong-thuc-hanh-ban-dan-voi-thiet-bi-intel-${20261020000000 + i}.htm">TP.HCM mở xưởng thực hành bán dẫn số ${i}</a>`).join('')
  const html = `<body>
    <a href="/tto-plo.htm">Pháp luật và các tin tức liên quan khác nữa</a>
    <a href="https://other.com/bai-viet-20261020000000.htm">A long enough headline on another website entirely</a>
    <a href="/ngan.htm-20261020000000.htm">Ngắn</a>
    ${articles}
    ${articles}
  </body>`
  const found = extractListing(html, LISTING)
  assert.equal(found.length, 12)
  assert.ok(found.every((a) => a.url.startsWith('https://tuoitre.vn/') && /-\d{14,}\.htm$/.test(a.url)))
  assert.equal(new Set(found.map((a) => a.url)).size, 12)
  assert.equal(found[0].source, 'Tuổi Trẻ')
  assert.equal(found[0].needsDetails, true)
  assert.equal(found[0].category, 'Vietnam News')
})

test('extractListing uses the anchor title attribute when the text is just an image or icon', () => {
  const html = '<a href="/bai-viet-ban-dan-20261020123456789.htm" title="Chiến lược phát triển công nghiệp bán dẫn của thành phố"><img src="x.jpg"></a>'
  const [found] = extractListing(html, LISTING)
  assert.equal(found.title, 'Chiến lược phát triển công nghiệp bán dẫn của thành phố')
})

/* ----------------------------- enrichment --------------------------------- */

test('parseArticlePage reads Open Graph tags, then JSON-LD, then <time>', () => {
  const og = parseArticlePage(`<head><meta property="og:description" content="Mô tả &amp; chi tiết"><meta property="og:image" content="https://x/i.jpg"><meta property="article:published_time" content="2026-10-22T09:30:00+07:00"></head>`)
  assert.equal(og.description, 'Mô tả & chi tiết')
  assert.equal(og.image, 'https://x/i.jpg')
  assert.equal(og.publishedAt.toISOString(), '2026-10-22T02:30:00.000Z')

  const ld = parseArticlePage('<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-10-21T08:00:00+07:00"}</script>')
  assert.equal(ld.publishedAt.toISOString(), '2026-10-21T01:00:00.000Z')

  const tag = parseArticlePage('<time datetime="2026-10-19">19/10</time>')
  assert.equal(tag.publishedAt.toISOString().slice(0, 10), '2026-10-19')

  assert.equal(parseArticlePage('<p>nothing</p>').publishedAt, null)
})

test('enrichArticles fills in description, date and image, and keeps estimates when a page fails', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/ok') {
      res.setHeader('Content-Type', 'text/html')
      res.end('<head><meta property="og:description" content="Mô tả thật"><meta property="article:published_time" content="2026-10-18T00:00:00Z"><meta property="og:image" content="https://x/cover.jpg"></head>')
    } else {
      res.statusCode = 500
      res.end()
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const estimate = new Date('2026-10-22T00:00:00Z')
    const input = [
      { url: `${base}/ok`, title: 'a', summary: '', publishedAt: estimate, needsDetails: true },
      { url: `${base}/fail`, title: 'b', summary: '', publishedAt: estimate, needsDetails: true },
      { url: `${base}/untouched`, title: 'c', summary: 'keep', publishedAt: estimate },
    ]
    const [ok, failed, untouched] = await enrichArticles(input)

    assert.equal(ok.summary, 'Mô tả thật')
    assert.equal(ok.publishedAt.toISOString(), '2026-10-18T00:00:00.000Z')
    assert.equal(ok.thumbnail, 'https://x/cover.jpg')
    assert.equal('needsDetails' in ok, false)

    assert.equal(failed.needsDetails, true, 'a page that could not be read stays a candidate')
    assert.equal(failed.publishedAt, estimate)
    assert.equal(untouched.summary, 'keep')
    assert.equal(input[0].needsDetails, true, 'inputs are not modified')
  } finally {
    server.close()
  }
})

/* --------------------------------- jobs ----------------------------------- */

test('parseUpdatedDate reads the Vietnamese "Cập nhật" date', () => {
  assert.equal(parseUpdatedDate('Hạn nộp: 10-11-2026 Cập nhật: 22-10-2026').toISOString().slice(0, 10), '2026-10-22')
  assert.equal(parseUpdatedDate('no date here'), null)
})

test('parseCareerVietJobs maps a result card with company, location and update date', () => {
  const html = `<div class="job-item">
    <h2><a class="job_link" title="FPGA Design Engineer" href="/vi/tim-viec-lam/fpga-design-engineer.35C.html">FPGA Design Engineer</a></h2>
    <a class="company-name" title="Chipco Vietnam">Chipco Vietnam</a>
    <div class="location" title="Hà Nội"></div>
    <div>Hạn nộp: 10-11-2026 Cập nhật: 20-10-2026</div>
  </div>
  <div class="job-item"><h2><a class="job_link" title="Kế toán tổng hợp" href="/vi/tim-viec-lam/ke-toan.html">Kế toán tổng hợp</a></h2><a class="company-name">Shop</a></div>`
  const jobs = parseCareerVietJobs(html)
  assert.equal(jobs.length, 1, 'the unrelated job is filtered out')
  assert.equal(jobs[0].url, 'https://careerviet.vn/vi/tim-viec-lam/fpga-design-engineer.35C.html')
  assert.equal(jobs[0].summary, 'Chipco Vietnam · Hà Nội')
  assert.equal(jobs[0].source, 'CareerViet')
  assert.equal(jobs[0].publishedAt.toISOString().slice(0, 10), '2026-10-20')
})

test('parsePostedOn understands Workday wording', () => {
  const now = Date.parse('2026-10-23T00:00:00Z')
  assert.equal(parsePostedOn('Posted Today', now).getTime(), now)
  assert.equal(parsePostedOn('Posted Yesterday', now).toISOString().slice(0, 10), '2026-10-22')
  assert.equal(parsePostedOn('Posted 3 Days Ago', now).toISOString().slice(0, 10), '2026-10-20')
  assert.equal(parsePostedOn('Posted 30+ Days Ago', now).toISOString().slice(0, 10), '2026-09-23')
  assert.equal(parsePostedOn('Posted whenever', now), null)
})

test('jobFromPosting keeps relevant engineering roles in Vietnam, with company and a direct link', () => {
  const source = { company: 'NVIDIA', tenant: 'nvidia', wd: 'wd5', site: 'NVIDIAExternalCareerSite' }
  const job = jobFromPosting({ title: 'Senior ASIC Verification Engineer', locationsText: 'Vietnam, Ho Chi Minh City', externalPath: '/job/Vietnam-Ho-Chi-Minh/Senior-ASIC_JR1', postedOn: 'Posted 2 Days Ago' }, source)
  assert.equal(job.url, 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Vietnam-Ho-Chi-Minh/Senior-ASIC_JR1')
  assert.equal(job.summary, 'NVIDIA · Vietnam, Ho Chi Minh City')
  assert.equal(job.source, 'NVIDIA Careers')

  const abroad = jobFromPosting({ title: 'ASIC Design Engineer', locationsText: 'Santa Clara, CA', externalPath: '/job/x' }, source)
  assert.equal(abroad, null, 'not in Vietnam')
  const notEngineering = jobFromPosting({ title: 'Warehouse Logistics Coordinator', locationsText: 'Vietnam, Hanoi', externalPath: '/job/y' }, source)
  assert.equal(notEngineering, null, 'not an engineering role')
  assert.equal(jobFromPosting({ title: 'Verification Engineer', locationsText: 'Vietnam' }, source), null, 'no path, no link')
})

/* ------------------------------- pipeline --------------------------------- */

test('prepareArticles prefers the direct link over the same story from Google News', () => {
  const title = 'Khủng hoảng heli bủa vây ngành chip và bán dẫn'
  const now = new Date()
  const out = prepareArticles([
    // The Google copy has a real, newer date, so it would otherwise win on score.
    { title, summary: '', url: 'https://news.google.com/rss/articles/CBMi123?oc=5', source: 'VnExpress', category: 'Vietnam News', publishedAt: now, strictMatch: true },
    { title, summary: 'Nguồn cung heli thiếu hụt', url: 'https://vnexpress.net/khung-hoang-heli-4900000.html', source: 'VnExpress', category: 'Vietnam News', publishedAt: new Date(now - 3600_000), strictMatch: true },
  ])
  assert.equal(out.length, 1)
  assert.equal(out[0].url, 'https://vnexpress.net/khung-hoang-heli-4900000.html')
})

test('prepareArticles decodes entities in titles from feeds that leave them in', () => {
  const [article] = prepareArticles([{ title: 'Smartphone t&igrave;m nguồn cung chip', summary: '', url: 'https://thanhnien.vn/a-1.htm', source: 'Thanh Niên', category: 'Vietnam News', publishedAt: new Date() }])
  assert.equal(article.title, 'Smartphone tìm nguồn cung chip')
})
