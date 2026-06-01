import Parser from 'rss-parser'
import { ARTICLES_PER_CATEGORY, SCRAPER_MIN_POOL } from '../../constants/news.js'

const parser = new Parser()

const VIETNAM_RSS_FEEDS = [
  { name: 'VnExpress', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { name: 'VietnamNet', url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
  { name: 'TuoiTre', url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
]

const VIETNAM_KEYWORDS_STRICT = [
  'bán dẫn',
  'chip',
  'vi mạch',
  'intel',
  'samsung',
  'nvidia',
  'ic design',
  'tsmc',
  'amd',
  'semiconductor',
]

const VIETNAM_KEYWORDS_RELAXED = ['công nghệ', 'ai', 'điện tử', 'máy tính', 'startup', 'fpt', 'viettel']

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function isRelevant(item, strict = true) {
  const contentStr = getContentString(item)
  const keywords = strict ? VIETNAM_KEYWORDS_STRICT : VIETNAM_KEYWORDS_RELAXED
  return keywords.some((kw) => contentStr.includes(kw))
}

function pushArticle(articles, seenUrls, item, feed) {
  if (!item.link || !item.title || seenUrls.has(item.link)) return false
  seenUrls.add(item.link)
  articles.push({
    title: item.title,
    summary: item.contentSnippet || item.content || 'News article from Vietnam.',
    url: item.link,
    source: feed.name,
    category: 'Vietnam News',
    publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
  })
  return true
}

export const fetchVietnamNews = async () => {
  const articles = []
  const seenUrls = new Set()
  const maxScanPerFeed = 30

  const collectFromFeeds = async (strict) => {
    for (const feed of VIETNAM_RSS_FEEDS) {
      try {
        const parsedFeed = await parser.parseURL(feed.url)
        let addedFromFeed = 0
        for (const item of parsedFeed.items || []) {
          if (addedFromFeed >= SCRAPER_MIN_POOL) break
          if (isRelevant(item, strict)) {
            if (pushArticle(articles, seenUrls, item, feed)) {
              addedFromFeed++
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching ${feed.name}:`, err.message)
      }
      if (articles.length >= SCRAPER_MIN_POOL) break
    }
  }

  await collectFromFeeds(true)

  if (articles.length < ARTICLES_PER_CATEGORY) {
    console.warn(
      `Vietnam News: only ${articles.length} strict matches, retrying with relaxed filter`
    )
    await collectFromFeeds(false)
  }

  if (articles.length < ARTICLES_PER_CATEGORY) {
    for (const feed of VIETNAM_RSS_FEEDS) {
      if (articles.length >= ARTICLES_PER_CATEGORY) break
      try {
        const parsedFeed = await parser.parseURL(feed.url)
        let scanned = 0
        for (const item of parsedFeed.items || []) {
          if (scanned >= maxScanPerFeed) break
          scanned++
          pushArticle(articles, seenUrls, item, feed)
          if (articles.length >= SCRAPER_MIN_POOL) break
        }
      } catch (err) {
        console.error(`Error fetching ${feed.name} (fallback):`, err.message)
      }
    }
  }

  articles.sort((a, b) => b.publishedAt - a.publishedAt)
  console.log(`Vietnam News scraper collected ${articles.length} articles`)
  return articles
}
