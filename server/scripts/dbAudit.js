/**
 * Read-only health report for the database.
 *
 *   npm run db-audit
 *
 * Prints collection sizes, the query plan of every hot read (so a missing index
 * shows up as COLLSCAN or a high docs-examined/returned ratio) and how often each
 * index has actually been used since the server started. Never writes.
 *
 * "ops 0" on an index only means it was not used since the last restart — check
 * it against the route code before dropping it.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

import './registerModels.js'
import Document from '../models/Document.js'
import Member from '../models/Member.js'
import News from '../models/News.js'
import PageView from '../models/PageView.js'
import Research from '../models/Research.js'
import { searchFilter } from '../models/plugins/searchTokens.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)
const db = mongoose.connection.db

console.log('server', (await db.admin().serverInfo()).version)
console.log('\n== collections (docs / avgObj bytes / data KB / index KB)')
for (const c of await db.listCollections().toArray()) {
  const s = await db.command({ collStats: c.name }).catch(() => null)
  if (!s) continue
  console.log(c.name.padEnd(14), String(s.count).padStart(7), String(Math.round(s.avgObjSize || 0)).padStart(7), String(Math.round(s.size / 1024)).padStart(8), String(Math.round(s.totalIndexSize / 1024)).padStart(8), 'idx:', Object.keys(s.indexSizes).join(', '))
}

async function plan(label, cursor) {
  const e = await cursor.explain('executionStats')
  const st = e.executionStats
  const stage = JSON.stringify(e.queryPlanner.winningPlan).match(/"stage":"(COLLSCAN|IXSCAN|FETCH|SORT|PROJECTION[A-Z_]*)"/g)?.map((x) => x.slice(9, -1)).join('>')
  console.log(label.padEnd(34), 'returned', String(st.nReturned).padStart(4), 'keys', String(st.totalKeysExamined).padStart(5), 'docs', String(st.totalDocsExamined).padStart(5), stage, `${st.executionTimeMillis}ms`)
}

console.log('\n== query plans')
await plan('members by category', Member.find({ category: 'Students' }).sort({ createdAt: -1 }).limit(12))
await plan('members search (tokens)', Member.find(searchFilter('nguyen')).sort({ createdAt: -1 }).limit(12))
await plan('documents list', Document.find({}).sort({ createdAt: -1 }).limit(10))
await plan('documents type+owned', Document.find({ type: 'Free', isLabOwned: true }).sort({ createdAt: -1 }).limit(10))
await plan('research by category', Research.find({ category: 'Publications' }).sort({ createdAt: -1 }).limit(9))
await plan('news published feed', News.find({ status: 'approved', category: 'World News' }).sort({ createdAt: -1 }).limit(20))
await plan('news admin by status+date', News.find({ status: 'pending', publishedAt: { $gte: new Date(0) } }).sort({ createdAt: -1 }).limit(20))
await plan('pageviews top urls window', PageView.find({ createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }))
await plan('pageviews by ip', PageView.find({ ip: '::1' }).sort({ createdAt: -1 }).limit(10))

console.log('\n== top-pages aggregation (as the dashboard runs it)')
const t0 = Date.now()
const top = await PageView.aggregate([{ $group: { _id: '$url', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 6 }])
console.log(top.length, 'groups in', Date.now() - t0, 'ms')

console.log('\n== unused / duplicate index check (accesses since server start)')
for (const name of ['pageviews', 'news', 'members', 'documents', 'researches', 'auditlogs']) {
  const stats = await db.collection(name).aggregate([{ $indexStats: {} }]).toArray().catch(() => [])
  for (const s of stats) console.log(name.padEnd(12), s.name.padEnd(34), 'ops', s.accesses.ops)
}
await mongoose.disconnect()
