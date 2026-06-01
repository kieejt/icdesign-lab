import axios from 'axios'
import Parser from 'rss-parser'

const parser = new Parser()

const ARXIV_URL = 'http://export.arxiv.org/api/query?search_query=(cat:cs.AR+OR+cat:cs.ET+OR+cat:cs.HW)+AND+(all:"vlsi"+OR+all:"asic"+OR+all:"fpga"+OR+all:"cmos"+OR+all:"integrated+circuit"+OR+all:"chip+design")&sortBy=submittedDate&sortOrder=descending&max_results=10'
const OPENALEX_URL = 'https://api.openalex.org/works?filter=title.search:vlsi|asic|fpga|chip|semiconductor&sort=publication_date:desc&per-page=10'
const SEMANTIC_QUERIES = ["vlsi", "asic", "fpga", "chip design"]

const YOUTUBE_CHANNELS = [
  // Asianometry
  'https://www.youtube.com/feeds/videos.xml?channel_id=UC1Tpt6KNkGykK82j03A4-1w',
  // High Yield
  'https://www.youtube.com/feeds/videos.xml?channel_id=UCY7ZEdM6q5zF_qLsb7yL7hQ'
]

export const fetchStudies = async () => {
  let articles = []

  // 1. arXiv
  try {
    const arxivResponse = await axios.get(ARXIV_URL)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    const titleRegex = /<title>([\s\S]*?)<\/title>/
    const summaryRegex = /<summary>([\s\S]*?)<\/summary>/
    const idRegex = /<id>([\s\S]*?)<\/id>/
    const publishedRegex = /<published>([\s\S]*?)<\/published>/

    let match
    while ((match = entryRegex.exec(arxivResponse.data)) !== null) {
      const entry = match[1]
      articles.push({
        title: entry.match(titleRegex)?.[1]?.trim().replace(/\n/g, ' '),
        summary: entry.match(summaryRegex)?.[1]?.trim().replace(/\n/g, ' '),
        url: entry.match(idRegex)?.[1]?.trim(),
        source: 'arXiv',
        category: 'Studies',
        publishedAt: new Date(entry.match(publishedRegex)?.[1]?.trim()),
      })
    }
  } catch (err) {
    console.error('Error fetching arXiv:', err.message)
  }

  // 2. OpenAlex
  try {
    const openAlexResponse = await axios.get(OPENALEX_URL)
    const works = openAlexResponse.data?.results || []
    works.forEach((work) => {
      if (work.title) {
        articles.push({
          title: work.title,
          summary: work.abstract_inverted_index ? 'Abstract available on OpenAlex.' : 'No abstract available.',
          url: work.id || work.doi,
          source: 'OpenAlex',
          category: 'Studies',
          publishedAt: new Date(work.publication_date || Date.now()),
        })
      }
    })
  } catch (err) {
    console.error('Error fetching OpenAlex:', err.message)
  }

  // 3. Semantic Scholar
  for (const query of SEMANTIC_QUERIES) {
    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,abstract,url,year`
      const semanticResponse = await axios.get(url)
      const papers = semanticResponse.data?.data || []
      papers.forEach((paper) => {
        if (paper.title) {
          articles.push({
            title: paper.title,
            summary: paper.abstract || 'No abstract available.',
            url: paper.url,
            source: 'Semantic Scholar',
            category: 'Studies',
            publishedAt: paper.year ? new Date(`${paper.year}-01-01`) : new Date(),
          })
        }
      })
    } catch (err) {
      console.error(`Error fetching Semantic Scholar:`, err.message)
    }
  }

  // 4. YouTube Technical Channels
  for (const feedUrl of YOUTUBE_CHANNELS) {
    try {
      const parsedFeed = await parser.parseURL(feedUrl)
      let count = 0
      for (const item of parsedFeed.items) {
        if (count >= 5) break
        // Extract YouTube thumbnail ID from URL
        const videoId = item.id.replace('yt:video:', '')
        articles.push({
          title: item.title,
          summary: item.contentSnippet || item.content || 'Video content.',
          url: item.link,
          source: 'YouTube Studies',
          category: 'Studies',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: new Date(item.pubDate || item.isoDate),
        })
        count++
      }
    } catch (err) {
      console.error(`Error fetching YouTube:`, err.message)
    }
  }

  return articles
}
