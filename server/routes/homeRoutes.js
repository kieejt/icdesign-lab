import express from 'express'

import { httpCache, microCache } from '../middleware/cache.js'
import LabEvent from '../models/LabEvent.js'
import Member from '../models/Member.js'
import News from '../models/News.js'
import Recruitment from '../models/Recruitment.js'
import Research from '../models/Research.js'
import { statusFilter, todayInVietnam, withStatus } from '../utils/eventDates.js'
import { syncExpiredRecruitments } from './recruitmentRoutes.js'

const router = express.Router()

const newest = (Model, filter, limit, select) =>
  Model.find(filter).sort({ createdAt: -1 }).limit(limit).select(select).lean()

/**
 * Up to three events for the homepage: the nearest upcoming ones first, then
 * the most recent past ones if there are fewer than three coming up.
 */
async function homeEvents(limit = 3) {
  const today = todayInVietnam()
  const [upcoming, past] = await Promise.all([
    LabEvent.find(statusFilter('Upcoming', today)).sort({ eventDate: 1, createdAt: -1 }).limit(limit).lean(),
    LabEvent.find(statusFilter('Past', today)).sort({ eventDate: -1, createdAt: -1 }).limit(limit).lean(),
  ])
  return [...upcoming, ...past].slice(0, limit).map((event) => withStatus(event, today))
}

const newsFeed = (category, limit) =>
  newest(News, { status: 'approved', category }, limit, '-score -tags -__v')

/**
 * Everything the homepage shows, in one response.
 *
 * The page used to open nine separate requests (research x2, members x3,
 * recruitment, news x3). Each paid its own round trip, headers and cache lookup;
 * on a phone that is the dominant cost. The queries still run concurrently, but
 * against the database once per cache window instead of nine times per visitor.
 */
router.get('/', httpCache(60, 300), microCache('home', 30_000), async (req, res) => {
  try {
    await syncExpiredRecruitments()

    const [
      projects,
      projectTotal,
      publicationTotal,
      professors,
      professorTotal,
      students,
      studentTotal,
      alumni,
      alumniTotal,
      recruitment,
      worldNews,
      vietnamNews,
      jobsNews,
      events,
    ] = await Promise.all([
      newest(Research, { category: 'Project' }, 4, ''),
      Research.countDocuments({ category: 'Project' }),
      Research.countDocuments({ category: 'Publications' }),
      newest(Member, { category: 'Professors' }, 4, ''),
      Member.countDocuments({ category: 'Professors' }),
      newest(Member, { category: 'Students' }, 4, ''),
      Member.countDocuments({ category: 'Students' }),
      newest(Member, { category: 'Alumni' }, 4, ''),
      Member.countDocuments({ category: 'Alumni' }),
      Recruitment.find().sort({ createdAt: -1 }).limit(3).lean(),
      newsFeed('World News', 4),
      newsFeed('Vietnam News', 4),
      newsFeed('Jobs', 3),
      homeEvents(3),
    ])

    return res.json({
      projects: { data: projects, total: projectTotal },
      publications: { total: publicationTotal },
      professors: { data: professors, total: professorTotal },
      students: { data: students, total: studentTotal },
      alumni: { data: alumni, total: alumniTotal },
      recruitment,
      worldNews,
      vietnamNews,
      jobsNews,
      events,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load the homepage' })
  }
})

export default router
