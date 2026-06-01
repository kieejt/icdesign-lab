import Parser from 'rss-parser'
import { ARTICLES_PER_CATEGORY, SCRAPER_MIN_POOL } from '../../constants/news.js'

const parser = new Parser()

const RSS_FEEDS = [
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/' },
  { name: 'CNBC Tech', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000366' },
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Reuters Tech (Google News)', url: 'https://news.google.com/rss/search?q=source:reuters+technology&hl=en-US&gl=US&ceid=US:en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
]

const SEMICONDUCTOR_KEYWORDS = [
  'chip',
  'semiconductor',
  'intel',
  'tsmc',
  'amd',
  'nvidia',
  'arm',
  'asic',
  'fpga',
  'vlsi',
  'foundry',
  'wafer',
]

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function isRelevant(item, feed, strict = true) {
  const contentStr = getContentString(item)
  const feedBoost =
    feed.name.includes('Semiconductor') || feed.name.includes('EE Times')

  if (feedBoost) return true

  const keywordHits = SEMICONDUCTOR_KEYWORDS.filter((kw) => contentStr.includes(kw)).length
  return strict ? keywordHits >= 1 : keywordHits >= 0
}

function pushArticle(articles, seenUrls, item, feed) {
  if (!item.link || !item.title || seenUrls.has(item.link)) return false
  seenUrls.add(item.link)
  articles.push({
    title: item.title,
    summary: item.contentSnippet || item.content || '',
    url: item.link,
    source: feed.name,
    category: 'World News',
    publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
  })
  return true
}

export const fetchWorldNews = async () => {
  const articles = []
  const seenUrls = new Set()
  const maxScanPerFeed = 25

  const collectFromFeeds = async (strict) => {
    for (const feed of RSS_FEEDS) {
      try {
        const parsedFeed = await parser.parseURL(feed.url)
        let addedFromFeed = 0
        for (const item of parsedFeed.items || []) {
          if (addedFromFeed >= SCRAPER_MIN_POOL) break
          if (isRelevant(item, feed, strict)) {
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
      `World News: only ${articles.length} strict matches, retrying with relaxed filter`
    )
    await collectFromFeeds(false)
  }

  if (articles.length < ARTICLES_PER_CATEGORY) {
    for (const feed of RSS_FEEDS) {
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

  console.log(`World News scraper collected ${articles.length} articles`)
  return articles
}
