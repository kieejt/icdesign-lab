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

export const fetchWorldNewsHtml = async () => {
  const articles = []
  
  for (const source of HTML_SOURCES) {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })
      
      const $ = cheerio.load(response.data)
      const seenLinks = new Set()
      
      // Generic heuristic: look for links with substantial text content (likely article titles)
      $('a').each((i, el) => {
        let title = $(el).find('h2, h3, .title, .article-name').first().text().trim()
        if (!title) {
          title = $(el).text().trim()
        }
        
        // Clean up title
        title = title.replace(/\s+/g, ' ')
        
        let link = $(el).attr('href')
        
        if (title && title.length > 30 && link && !seenLinks.has(link)) {
          seenLinks.add(link)
          
          if (link.startsWith('/')) {
            const baseUrl = new URL(source.url)
            link = `${baseUrl.origin}${link}`
          }
          
          articles.push({
            title,
            summary: `News article from ${source.name}.`,
            url: link,
            source: source.name,
            category: 'World News',
            publishedAt: new Date(),
            strictMatch: true // These are specific semiconductor pages, so they are strict matches
          })
        }
      })
      
    } catch (err) {
      console.error(`Error fetching HTML source ${source.name}:`, err.message)
    }
  }

  return articles
}
