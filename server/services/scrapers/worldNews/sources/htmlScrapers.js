import axios from 'axios'
import * as cheerio from 'cheerio'

const HTML_SOURCES = [
  {
    name: "Tom's Hardware (Semiconductors)",
    url: 'https://www.tomshardware.com/tech-industry/manufacturing/semiconductors'
  },
  {
    name: 'DIGITIMES (Semiconductors)',
    url: 'https://www.digitimes.com/topic/semiconductors/'
  }
]

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

// Fetches the article page itself to pull a real description instead of a fake placeholder
// string, so the AI ranker has actual content to summarize/judge relevance from.
async function fetchArticleDescription(url) {
  try {
    const response = await axios.get(url, { headers: REQUEST_HEADERS, timeout: 10000 })
    const $ = cheerio.load(response.data)
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''
    return description.trim()
  } catch (err) {
    return ''
  }
}

export const fetchWorldNewsHtml = async () => {
  const candidates = []

  for (const source of HTML_SOURCES) {
    try {
      const response = await axios.get(source.url, { headers: REQUEST_HEADERS, timeout: 15000 })

      const $ = cheerio.load(response.data)
      const seenLinks = new Set()
      let count = 0

      // Generic heuristic: look for links with substantial text content (likely article titles)
      $('a').each((i, el) => {
        if (count >= 4) return // LIMIT: Only take top 4 articles per HTML source to prevent crowding out RSS

        let title = $(el).find('h2, h3, .title, .article-name').first().text().trim()
        if (!title) {
          title = $(el).text().trim()
        }

        // Clean up title
        title = title.replace(/\s+/g, ' ')

        let link = $(el).attr('href')

        if (title && title.length > 30 && link && !seenLinks.has(link)) {
          seenLinks.add(link)
          count++

          if (link.startsWith('/')) {
            const baseUrl = new URL(source.url)
            link = `${baseUrl.origin}${link}`
          }

          candidates.push({
            title,
            url: link,
            source: source.name,
            category: 'World News',
            // Subtract 12 hours so it doesn't always automatically win the "newest" sort against actual RSS feeds today
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            strictMatch: true // These are specific semiconductor pages, so they are strict matches
          })
        }
      })

    } catch (err) {
      console.error(`Error fetching HTML source ${source.name}:`, err.message)
    }
  }

  const descriptions = await Promise.allSettled(candidates.map((c) => fetchArticleDescription(c.url)))

  return candidates.map((c, i) => {
    const fetched = descriptions[i].status === 'fulfilled' ? descriptions[i].value : ''
    return {
      ...c,
      summary: fetched || `News article from ${c.source}.`,
    }
  })
}
