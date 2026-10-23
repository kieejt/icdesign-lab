import express from 'express'
import mongoose from 'mongoose'

import { httpCache, microCache } from '../middleware/cache.js'
import Gallery from '../models/Gallery.js'
import LabEvent from '../models/LabEvent.js'
import Member from '../models/Member.js'
import Research from '../models/Research.js'

/*
 * Crawler-facing endpoints.
 *
 * The frontend is a single-page app, so a crawler that does not run JavaScript
 * (link-preview bots for Facebook, Zalo, Slack, LinkedIn; many search crawlers)
 * only ever sees the generic index.html. nginx routes those user agents here to
 * get a small HTML document carrying the right title and Open Graph tags for the
 * page they asked about; humans still get the SPA.
 */

const router = express.Router()

const SITE_NAME = 'IC design Lab'
const DEFAULT_DESCRIPTION =
  'Integrated Circuit Design Laboratory at Hanoi University of Science and Technology. Research and training in advanced IC technology, embedded systems and computer engineering.'

/** Canonical origin. Set SITE_URL in production; the request host is the fallback. */
const siteUrl = (req) =>
  (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])

const clip = (text = '', max = 300) => String(text).replace(/\s+/g, ' ').trim().slice(0, max)

const STATIC_PAGES = [
  ['/', 'weekly', '1.0'],
  ['/people/professor', 'monthly', '0.7'],
  ['/people/students', 'monthly', '0.6'],
  ['/people/alumni', 'monthly', '0.5'],
  ['/research/project', 'weekly', '0.9'],
  ['/research/publications', 'weekly', '0.9'],
  ['/lab-event/event', 'weekly', '0.6'],
  ['/lab-event/gallery', 'monthly', '0.5'],
  ['/documents', 'weekly', '0.6'],
  ['/lectures', 'weekly', '0.5'],
  ['/news/world-news', 'daily', '0.5'],
  ['/news/vietnam-news', 'daily', '0.5'],
  ['/news/jobs', 'daily', '0.5'],
  ['/contact', 'yearly', '0.4'],
]

router.get('/robots.txt', httpCache(3600, 86400), (req, res) => {
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Disallow: /admin',
        'Disallow: /login',
        'Disallow: /api/',
        '',
        `Sitemap: ${siteUrl(req)}/sitemap.xml`,
        '',
      ].join('\n'),
    )
})

router.get('/sitemap.xml', httpCache(3600, 86400), microCache('seo', 10 * 60_000), async (req, res) => {
  try {
    const base = siteUrl(req)
    const [research, members, events, albums] = await Promise.all([
      Research.find().select('category updatedAt').lean(),
      Member.find().select('category updatedAt').lean(),
      LabEvent.find().select('updatedAt').lean(),
      Gallery.find().select('updatedAt').lean(),
    ])

    const urls = [
      ...STATIC_PAGES.map(([loc, changefreq, priority]) => ({ loc, changefreq, priority })),
      ...research.map((item) => ({
        loc: `/research/${item.category === 'Publications' ? 'publications' : 'project'}/${item._id}`,
        lastmod: item.updatedAt,
        priority: '0.8',
      })),
      ...members.map((item) => ({
        loc: `/people/${item.category === 'Professors' ? 'professor' : item.category.toLowerCase()}/${item._id}`,
        lastmod: item.updatedAt,
        priority: '0.5',
      })),
      ...events.map((item) => ({
        loc: `/lab-event/event/${item._id}`,
        lastmod: item.updatedAt,
        priority: '0.5',
      })),
      ...albums.map((item) => ({
        loc: `/lab-event/gallery/${item._id}`,
        lastmod: item.updatedAt,
        priority: '0.4',
      })),
    ]

    const body = urls
      .map(
        ({ loc, lastmod, changefreq, priority }) =>
          `  <url><loc>${escapeHtml(base + loc)}</loc>` +
          (lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '') +
          (changefreq ? `<changefreq>${changefreq}</changefreq>` : '') +
          `<priority>${priority}</priority></url>`,
      )
      .join('\n')

    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
      )
  } catch {
    res.status(500).type('text/plain').send('Could not build the sitemap')
  }
})

/** Resolves a public path to the record behind it, or null for generic pages. */
async function describePath(path) {
  const parts = path.split('/').filter(Boolean)
  const [section, kind, id] = parts
  if (parts.length < 3 || !mongoose.isValidObjectId(id)) return null

  if (section === 'research') {
    const item = await Research.findById(id).lean()
    return (
      item && {
        title: item.title,
        description: [item.authors, item.journal, item.description].filter(Boolean).join(' · '),
        image: item.image,
        type: 'article',
      }
    )
  }
  if (section === 'people') {
    const member = await Member.findById(id).lean()
    return (
      member && {
        title: member.name,
        description: [member.role, member.research].filter(Boolean).join(' · '),
        image: member.image,
        type: 'profile',
      }
    )
  }
  if (section === 'lab-event' && kind === 'event') {
    const event = await LabEvent.findById(id).lean()
    return event && { title: event.title, description: [event.date, event.location].filter(Boolean).join(' · '), type: 'article' }
  }
  if (section === 'lab-event' && kind === 'gallery') {
    const album = await Gallery.findById(id).lean()
    return (
      album && {
        title: album.title,
        description: `Photo album — ${album.category}`,
        image: album.coverImage,
        type: 'article',
      }
    )
  }
  return null
}

router.get('/page', microCache('seo', 5 * 60_000), async (req, res) => {
  const path = String(req.query.path || '/').split('?')[0].slice(0, 200)
  if (!path.startsWith('/')) return res.status(400).type('text/plain').send('Bad path')

  let page = null
  try {
    page = await describePath(path)
  } catch {
    // Fall through to the generic card — a link preview should never error.
  }

  const base = siteUrl(req)
  const title = page ? `${page.title} — ${SITE_NAME}` : SITE_NAME
  const description = clip(page?.description) || DEFAULT_DESCRIPTION
  const imagePath = page?.image || '/lab-hero.webp'
  const imageUrl = imagePath.startsWith('http') ? imagePath : base + imagePath
  const url = base + path

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${page?.type || 'website'}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p></body>
</html>`)
})

export default router
