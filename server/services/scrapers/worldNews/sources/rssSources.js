import Parser from 'rss-parser'
import { hasKeyword } from '../../../../utils/textMatch.js'

// rss-parser defaults to a 60s timeout per feed; combined with fetching feeds sequentially
// that's several minutes of worst-case stall if one feed goes unresponsive. Fetch feeds in
// parallel with a tighter per-feed timeout instead.
const FEED_TIMEOUT_MS = 15000
const parser = new Parser({ timeout: FEED_TIMEOUT_MS })

const RSS_FEEDS = [
  // Existing
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/' },
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Reuters Tech (Google News)', url: 'https://news.google.com/rss/search?q=source:reuters+technology&hl=en-US&gl=US&ceid=US:en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  // New specific to semiconductor/IC design
  { name: 'Electronics Weekly', url: 'https://www.electronicsweekly.com/feed/' },
  { name: 'Semiconductor Digest', url: 'https://www.semiconductor-digest.com/feed/' }
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
  'ic design',
  'eda',
]

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function computeStrictMatch(item, feed) {
  const contentStr = getContentString(item)
  const feedBoost =
    feed.name.includes('Semiconductor') || feed.name.includes('EE Times') || feed.name.includes('Circuits') || feed.name.includes('Electronics')

  if (feedBoost) return true

  const keywordHits = SEMICONDUCTOR_KEYWORDS.filter((kw) => hasKeyword(contentStr, kw)).length
  return keywordHits >= 1
}

export const fetchWorldNewsRss = async () => {
  const maxScanPerFeed = 25

  // Fetch every feed in parallel — one slow/unresponsive feed no longer blocks the others.
  const results = await Promise.allSettled(RSS_FEEDS.map((feed) => parser.parseURL(feed.url)))

  const articles = []
  results.forEach((result, i) => {
    const feed = RSS_FEEDS[i]
    if (result.status !== 'fulfilled') {
      console.error(`Error fetching ${feed.name}:`, result.reason?.message || result.reason)
      return
    }

    let scanned = 0
    for (const item of result.value.items || []) {
      if (scanned >= maxScanPerFeed) break
      scanned++

      // Every scraped item is kept — quantity is prioritized over pre-filtering, since
      // admin review is the actual relevance gate before anything gets published.
      // strictMatch only decides sort priority so genuinely on-topic articles surface first.
      articles.push({
        title: item.title,
        summary: item.contentSnippet || item.content || '',
        url: item.link,
        source: feed.name,
        category: 'World News',
        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
        strictMatch: computeStrictMatch(item, feed)
      })
    }
  })

  return articles
}
