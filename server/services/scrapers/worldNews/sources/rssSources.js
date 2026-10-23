import { hasKeyword } from '../../../../utils/textMatch.js'
import { trackSource } from '../../../runReport.js'
import { fetchFeed } from '../../feeds.js'
import { mapLimit } from '../../http.js'

const RSS_FEEDS = [
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/' },
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all' },
  { name: 'Reuters Tech (Google News)', url: 'https://news.google.com/rss/search?q=source:reuters+technology&hl=en-US&gl=US&ceid=US:en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Electronics Weekly', url: 'https://www.electronicsweekly.com/feed/' },
  { name: 'Semiconductor Digest', url: 'https://www.semiconductor-digest.com/feed/' },
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

const MAX_SCAN_PER_FEED = 25
const FEED_CONCURRENCY = 5

function getContentString(item) {
  return `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
}

function computeStrictMatch(item, feed) {
  const feedBoost =
    feed.name.includes('Semiconductor') || feed.name.includes('EE Times') || feed.name.includes('Circuits') || feed.name.includes('Electronics')
  if (feedBoost) return true

  const contentStr = getContentString(item)
  return SEMICONDUCTOR_KEYWORDS.some((keyword) => hasKeyword(contentStr, keyword))
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export const fetchWorldNewsRss = async (ctx) => {
  // Feeds are fetched in parallel (bounded), and each is reported on its own, so
  // one slow or dead feed neither blocks the others nor hides in a total.
  const perFeed = await mapLimit(RSS_FEEDS, FEED_CONCURRENCY, (feed) =>
    trackSource(ctx, feed.name, async () => {
      const parsed = await fetchFeed(feed.url, ctx)

      // Every scraped item is kept — admin review is the relevance gate, and
      // strictMatch only decides sort priority so on-topic items surface first.
      return (parsed.items || []).slice(0, MAX_SCAN_PER_FEED).map((item) => ({
        title: item.title,
        summary: item.contentSnippet || item.content || '',
        url: item.link,
        source: feed.name,
        category: 'World News',
        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
        strictMatch: computeStrictMatch(item, feed),
      }))
    }),
  )

  return perFeed.flat()
}
