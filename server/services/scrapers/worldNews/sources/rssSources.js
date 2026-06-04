import Parser from 'rss-parser'

const parser = new Parser()

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

function isRelevant(item, feed, strict = true) {
  const contentStr = getContentString(item)
  const feedBoost =
    feed.name.includes('Semiconductor') || feed.name.includes('EE Times') || feed.name.includes('Circuits') || feed.name.includes('Electronics')

  if (feedBoost) return true

  const keywordHits = SEMICONDUCTOR_KEYWORDS.filter((kw) => contentStr.includes(kw)).length
  return strict ? keywordHits >= 1 : keywordHits >= 0
}

export const fetchWorldNewsRss = async () => {
  const articles = []
  const maxScanPerFeed = 25

  for (const feed of RSS_FEEDS) {
    try {
      const parsedFeed = await parser.parseURL(feed.url)
      let scanned = 0
      for (const item of parsedFeed.items || []) {
        if (scanned >= maxScanPerFeed) break
        scanned++
        
        // Push every potential article, relevance will be sorted/filtered in index.js or we can filter strictly here.
        // Let's attach a relevance score or strict flag.
        const strictMatch = isRelevant(item, feed, true)
        const relaxedMatch = isRelevant(item, feed, false)
        
        if (relaxedMatch || strictMatch) {
          articles.push({
            title: item.title,
            summary: item.contentSnippet || item.content || '',
            url: item.link,
            source: feed.name,
            category: 'World News',
            publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
            strictMatch // store this so index.js can prioritize
          })
        }
      }
    } catch (err) {
      console.error(`Error fetching ${feed.name}:`, err.message)
    }
  }

  return articles
}
