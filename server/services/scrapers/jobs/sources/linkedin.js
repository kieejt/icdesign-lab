import axios from 'axios'
import * as cheerio from 'cheerio'
import { JOB_SEARCH_QUERIES } from '../../../../constants/jobKeywords.js'
import { buildJobArticle, getBrowserHeaders, delay, isJobRelevant } from '../utils.js'

const LINKEDIN_QUERIES = Array.from(
  new Set([
    ...JOB_SEARCH_QUERIES,
    'semiconductor vietnam',
    'ic design vietnam',
    'chip design vietnam',
    'embedded vietnam',
    'analog layout vietnam',
    'verification engineer vietnam',
    'fpga vietnam',
    'vlsi vietnam',
    'asic vietnam',
    'rtl design vietnam',
  ])
).filter((q) => q.length <= 40)

export async function fetchLinkedIn() {
  const articles = []
  const seen = new Set()

  for (const keywords of LINKEDIN_QUERIES) {
    try {
      const page1 = await axios.get(
        'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search',
        {
          params: {
            keywords,
            location: 'Vietnam',
            start: 0,
          },
          headers: getBrowserHeaders({ Accept: 'text/html' }),
          timeout: 45000,
        }
      )

      const htmls = [page1.data]

      // Fetch page 2 for popular generic topics to maximize coverage
      if (
        keywords === 'embedded' ||
        keywords === 'semiconductor' ||
        keywords === 'ic design' ||
        keywords === 'embedded vietnam'
      ) {
        await delay(1200)
        try {
          const page2 = await axios.get(
            'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search',
            {
              params: {
                keywords,
                location: 'Vietnam',
                start: 25,
              },
              headers: getBrowserHeaders({ Accept: 'text/html' }),
              timeout: 45000,
            }
          )
          if (page2.data) {
            htmls.push(page2.data)
          }
        } catch (e2) {
          // Ignore secondary page failures
        }
      }

      for (const html of htmls) {
        const $ = cheerio.load(html)
        $('.base-card').each((_, el) => {
          const title = $(el).find('.base-search-card__title').text().trim()
          const company = $(el).find('.base-search-card__subtitle').text().trim()
          const location = $(el).find('.job-search-card__location').text().trim()
          let link = $(el).find('a.base-card__full-link').attr('href')
          if (!link) return
          if (link.startsWith('/')) link = `https://www.linkedin.com${link}`

          if (seen.has(link)) return

          const summary = [company, location].filter(Boolean).join(' · ')
          if (!isJobRelevant(title, summary)) return

          seen.add(link)

          const article = buildJobArticle({
            title,
            summary,
            url: link,
            source: 'LinkedIn',
            publishedAt: new Date(),
          })
          if (article) articles.push(article)
        })
      }

      await delay(1200)
    } catch (err) {
      console.error(`LinkedIn search "${keywords}":`, err.message)
    }
  }

  console.log(`LinkedIn: ${articles.length} jobs`)
  return articles
}
