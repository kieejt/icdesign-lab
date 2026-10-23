import { trackSource } from '../../../runReport.js'
import { mapLimit, post } from '../../http.js'
import { buildJobArticle, getBrowserHeaders } from '../utils.js'

/*
 * Company career sites on Workday. Workday exposes the same JSON the careers page
 * uses at /wday/cxs/<tenant>/<site>/jobs, with no login, so these are direct,
 * dated postings from the employers themselves: no re-posting by agencies and no
 * HTML to break.
 *
 * Verified working (Vietnam search returns postings): NVIDIA, Marvell, Intel. Others
 * were tried and returned 422/401 or nothing (Synopsys, Renesas, Microchip, Qorvo,
 * Arm, AMD, Qualcomm, Cadence, Micron, Analog Devices).
 *
 * To add a company: open its careers page; the address looks like
 *   https://<tenant>.<wdN>.myworkdayjobs.com/<site>
 * and the three parts are what goes below.
 */
export const COMPANIES = [
  { company: 'NVIDIA', tenant: 'nvidia', wd: 'wd5', site: 'NVIDIAExternalCareerSite' },
  { company: 'Marvell', tenant: 'marvell', wd: 'wd1', site: 'MarvellCareers' },
  { company: 'Intel', tenant: 'intel', wd: 'wd1', site: 'External' },
]

const PAGE_SIZE = 20
const MAX_PAGES = 3

const VIETNAM = /vietnam|ho chi minh|hanoi|ha noi|hcmc|da nang|binh duong|hai phong|bac ninh/i

/**
 * Titles of engineering roles in this field. The shared job keyword list contains
 * company names ("intel", "nvidia"), which is right for a job board and wrong
 * here, where every posting is from one of those companies and would pass.
 */
const ROLE = /design|verification|\brtl\b|asic|fpga|silicon|\bsoc\b|layout|physical|\bdft\b|firmware|embedded|hardware|analog|mixed[- ]signal|\beda\b|\bcad\b|validation|test engineer|chip|circuit|tape-?out|\bic\b|software engineer|solutions? architect|application engineer|field application/i

/** "Posted 3 Days Ago" / "Posted Today" -> Date. Unknown wording -> null. */
export function parsePostedOn(text = '', now = Date.now()) {
  const value = String(text).toLowerCase()
  const day = 24 * 3600 * 1000
  if (/today/.test(value)) return new Date(now)
  if (/yesterday/.test(value)) return new Date(now - day)
  const match = value.match(/(\d+)\+?\s*days?/)
  return match ? new Date(now - Number(match[1]) * day) : null
}

/** One Workday posting as a job article, or null when it is not a relevant role in Vietnam. */
export function jobFromPosting(posting, source, now = Date.now()) {
  if (!posting?.title || !posting?.externalPath) return null
  const where = String(posting.locationsText || '')
  if (!VIETNAM.test(`${where} ${posting.title}`)) return null
  if (!ROLE.test(posting.title)) return null

  return buildJobArticle({
    title: posting.title,
    summary: `${source.company} · ${where}`,
    url: `https://${source.tenant}.${source.wd}.myworkdayjobs.com/en-US/${source.site}${posting.externalPath}`,
    source: `${source.company} Careers`,
    publishedAt: parsePostedOn(posting.postedOn, now),
  })
}

async function fetchCompany(source, ctx) {
  const url = `https://${source.tenant}.${source.wd}.myworkdayjobs.com/wday/cxs/${source.tenant}/${source.site}/jobs`
  const jobs = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    if (ctx.signal?.aborted) break
    const { data } = await post(
      url,
      { appliedFacets: {}, limit: PAGE_SIZE, offset: page * PAGE_SIZE, searchText: 'Vietnam' },
      { headers: getBrowserHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }), timeout: 20_000 },
      { signal: ctx.signal },
    )
    const postings = data?.jobPostings || []
    for (const posting of postings) {
      const job = jobFromPosting(posting, source)
      if (job) jobs.push(job)
    }
    if (postings.length < PAGE_SIZE || (page + 1) * PAGE_SIZE >= (data?.total ?? 0)) break
  }

  return jobs
}

/** @param {{report: import('../../../runReport.js').RunReport, signal?: AbortSignal}} ctx */
export async function fetchWorkdayCompanies(ctx) {
  const perCompany = await mapLimit(COMPANIES, 3, (source) =>
    trackSource(ctx, `${source.company} Careers`, () => fetchCompany(source, ctx)),
  )
  return perCompany.flat()
}
