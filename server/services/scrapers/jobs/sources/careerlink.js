import axios from 'axios'
import * as cheerio from 'cheerio'
import { JOB_SEARCH_QUERIES } from '../../../../constants/jobKeywords.js'
import { buildJobArticle, getBrowserHeaders, isJobRelevant, delay } from '../utils.js'

export async function fetchCareerlink() {
  const articles = []
  const seen = new Set()

  // Use a subset of queries to avoid sending too many requests
  const queries = ['ic-design', 'semiconductor', 'embedded', 'fpga', 'vlsi']

  for (const query of queries) {
    try {
      const { data } = await axios.get(`https://www.careerlink.vn/viec-lam/k/${query}`, {
        headers: getBrowserHeaders({ Accept: 'text/html' }),
        timeout: 20000,
      })

      const $ = cheerio.load(data)

      $('.job-link').each((_, el) => {
        const title = $(el).find('h2, .job-title').text().trim() || $(el).attr('title')
        let link = $(el).attr('href')
        
        if (!link) return
        if (link.startsWith('/')) {
          link = `https://www.careerlink.vn${link}`
        }

        if (seen.has(link)) return

        const company = $(el).find('.company-name').text().trim() || 'Careerlink Job'
        const summary = `${company}`

        if (!isJobRelevant(title || link, summary)) return

        seen.add(link)

        const article = buildJobArticle({
          title: title || 'Careerlink Job',
          summary,
          url: link,
          source: 'Careerlink',
          publishedAt: new Date(),
        })

        if (article) articles.push(article)
      })

      await delay(1000)
    } catch (err) {
      console.error(`Careerlink search "${query}":`, err.message)
    }
  }

  console.log(`Careerlink: ${articles.length} jobs`)
  return articles
}
