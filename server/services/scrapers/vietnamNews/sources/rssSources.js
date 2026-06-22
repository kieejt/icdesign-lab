import Parser from 'rss-parser'

const parser = new Parser()

const VIETNAM_RSS_FEEDS = [
  // Existing
  { name: 'VnExpress (Công nghệ)', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { name: 'VnExpress (Khoa học)', url: 'https://vnexpress.net/rss/khoa-hoc.rss' },
  { name: 'VietnamNet', url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Công nghệ)', url: 'https://dantri.com.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Khoa học)', url: 'https://dantri.com.vn/rss/khoa-hoc.rss' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/cong-nghe-startup.rss' },
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

const VIETNAM_KEYWORDS_RELAXED = ['công nghệ', 'ai', 'điện tử', 'máy tính', 'startup', 'fpt', 'viettel']

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function isRelevant(item, strict = true) {
  const contentStr = getContentString(item)
  const keywords = strict ? VIETNAM_KEYWORDS_STRICT : VIETNAM_KEYWORDS_RELAXED
  return keywords.some((kw) => contentStr.includes(kw))
}

export const fetchVietnamNewsRss = async () => {
  const articles = []
  const maxScanPerFeed = 30

  for (const feed of VIETNAM_RSS_FEEDS) {
    try {
      const parsedFeed = await parser.parseURL(feed.url)
      let scanned = 0
      for (const item of parsedFeed.items || []) {
        if (scanned >= maxScanPerFeed) break
        scanned++
        
        const strictMatch = isRelevant(item, true)
        const relaxedMatch = isRelevant(item, false)
        
        if (relaxedMatch || strictMatch) {
          articles.push({
            title: item.title,
            summary: item.contentSnippet || item.content || 'News article from Vietnam.',
            url: item.link,
            source: feed.name,
            category: 'Vietnam News',
            publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
            strictMatch
          })
        }
      }
    } catch (err) {
      console.error(`Error fetching ${feed.name}:`, err.message)
    }
  }

  return articles
}
