import { hasKeyword } from '../../../../utils/textMatch.js'
import { trackSource } from '../../../runReport.js'
import { fetchFeed } from '../../feeds.js'
import { mapLimit } from '../../http.js'

const VIETNAM_RSS_FEEDS = [
  { name: 'VnExpress (Công nghệ)', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { name: 'VnExpress (Khoa học)', url: 'https://vnexpress.net/rss/khoa-hoc.rss' },
  { name: 'VietnamNet', url: 'https://vietnamnet.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Công nghệ)', url: 'https://dantri.com.vn/rss/cong-nghe.rss' },
  { name: 'Dân trí (Khoa học)', url: 'https://dantri.com.vn/rss/khoa-hoc.rss' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/cong-nghe-startup.rss' },
  { name: 'Genk', url: 'https://genk.vn/rss/home.rss' },
  { name: 'Tinh tế', url: 'https://tinhte.vn/rss' },
  { name: 'VietnamPlus (Công nghệ)', url: 'https://www.vietnamplus.vn/rss/congnghe-212.rss' },
  // English-language, but Vietnam-based and it carries the local chip-industry stories.
  { name: 'VnExpress International (Tech)', url: 'https://e.vnexpress.net/rss/tech.rss' },
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

const MAX_SCAN_PER_FEED = 30
const FEED_CONCURRENCY = 5

function computeStrictMatch(item) {
  const content = `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase()
  return VIETNAM_KEYWORDS_STRICT.some((keyword) => hasKeyword(content, keyword))
}

/**
 * @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx
 */
export const fetchVietnamNewsRss = async (ctx) => {
  const perFeed = await mapLimit(VIETNAM_RSS_FEEDS, FEED_CONCURRENCY, (feed) =>
    trackSource(ctx, feed.name, async () => {
      const parsed = await fetchFeed(feed.url, ctx)

      return (parsed.items || []).slice(0, MAX_SCAN_PER_FEED).map((item) => ({
        title: item.title,
        summary: item.contentSnippet || item.content || 'News article from Vietnam.',
        url: item.link,
        source: feed.name,
        category: 'Vietnam News',
        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
        strictMatch: computeStrictMatch(item),
      }))
    }),
  )

  return perFeed.flat()
}
