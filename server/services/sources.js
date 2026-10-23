import { fetchCareerlink } from './scrapers/jobs/sources/careerlink.js'
import { fetchLinkedIn } from './scrapers/jobs/sources/linkedin.js'
import { fetchVietnamWorks } from './scrapers/jobs/sources/vietnamworks.js'
import { fetchVietnamNewsRss } from './scrapers/vietnamNews/sources/rssSources.js'
import { fetchWorldNewsHtml } from './scrapers/worldNews/sources/htmlScrapers.js'
import { fetchWorldNewsRss } from './scrapers/worldNews/sources/rssSources.js'
import { withDeadline } from './scrapers/http.js'

/*
 * Every source the agent reads, and how long each group may take.
 *
 * The groups run in parallel. Each has a time budget: when it runs out the group
 * stops starting new requests and returns what it has, so one slow site can no
 * longer hold the whole run (LinkedIn alone used to take most of the run time,
 * with a 45 s timeout per query and no overall limit).
 */
export const SOURCE_GROUPS = [
  { name: 'World News RSS', run: fetchWorldNewsRss, deadlineMs: 60_000 },
  { name: 'World News pages', run: fetchWorldNewsHtml, deadlineMs: 60_000 },
  { name: 'Vietnam News RSS', run: fetchVietnamNewsRss, deadlineMs: 60_000 },
  { name: 'VietnamWorks', run: fetchVietnamWorks, deadlineMs: 90_000 },
  { name: 'LinkedIn', run: fetchLinkedIn, deadlineMs: 120_000 },
  { name: 'Careerlink', run: fetchCareerlink, deadlineMs: 60_000 },
]

/**
 * Reads every source group in parallel.
 *
 * @param {{report: import('./runReport.js').RunReport}} ctx
 * @param {typeof SOURCE_GROUPS} [groups] overridable for tests
 * @returns {Promise<object[]>} all articles, unfiltered
 */
export async function collectArticles(ctx, groups = SOURCE_GROUPS) {
  const results = await Promise.all(
    groups.map((group) =>
      withDeadline(group.deadlineMs, (signal) => group.run({ ...ctx, signal })).catch((error) => {
        // Sources record their own outcome; this only catches a group failing
        // before it could (a bug, not a slow site).
        ctx.report.addSource({ name: group.name, ok: false, error: error?.message || error })
        return []
      }),
    ),
  )
  return results.flat()
}
