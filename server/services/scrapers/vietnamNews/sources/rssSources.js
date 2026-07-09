import axios from 'axios'
import Parser from 'rss-parser'
import { hasKeyword } from '../../../../utils/textMatch.js'

const FEED_TIMEOUT_MS = 15000
const REQUEST_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
const parser = new Parser()

const VIETNAM_RSS_FEEDS = [
  // Existing
  { name: 'VnExpress (Công nghệ)', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { name: 'VnExpress (Khoa học)', url: 'https://vnexpress.net/rss/khoa-hoc.rss' },
  { name: 'VietnamNet', url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Công nghệ)', url: 'https://dantri.com.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Khoa học)', url: 'https://dantri.com.vn/rss/khoa-hoc.rss' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/cong-nghe-startup.rss' },
  // New: pure-tech VN sources with regular chip/semiconductor coverage
  { name: 'Genk', url: 'https://genk.vn/rss/home.rss' },
  { name: 'Tinh tế', url: 'https://tinhte.vn/rss' },
  { name: 'VietnamPlus (Công nghệ)', url: 'https://www.vietnamplus.vn/rss/congnghe-212.rss' },
]

const VIETNAM_KEYWORDS_STRICT = [
  'bán dẫn',
  'chip',
  'vi mạch',
  'intel',
  'nvidia',
  'ic design',
  'ic',
  'tsmc',
  'amd',
  'semiconductor',
]

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function computeStrictMatch(item) {
  const contentStr = getContentString(item)
  return VIETNAM_KEYWORDS_STRICT.some((kw) => hasKeyword(contentStr, kw))
}

async function fetchFeed(url) {
  // Fetch through axios (consistent UA/redirect/gzip handling) instead of rss-parser's own
  // fetch — some hosts (e.g. VietnamPlus) return a response rss-parser's client can't parse
  // directly but that axios retrieves fine.
  const res = await axios.get(url, { headers: REQUEST_HEADERS, timeout: FEED_TIMEOUT_MS })
  return parser.parseString(res.data)
}

export const fetchVietnamNewsRss = async () => {
  const maxScanPerFeed = 30

  // Fetch every feed in parallel — one slow/unresponsive feed no longer blocks the others.
  const results = await Promise.allSettled(VIETNAM_RSS_FEEDS.map((feed) => fetchFeed(feed.url)))

  const articles = []
  results.forEach((result, i) => {
    const feed = VIETNAM_RSS_FEEDS[i]
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
        summary: item.contentSnippet || item.content || 'News article from Vietnam.',
        url: item.link,
        source: feed.name,
        category: 'Vietnam News',
        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
        strictMatch: computeStrictMatch(item)
      })
    }
  })

  return articles
}
