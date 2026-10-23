import mongoose from 'mongoose'

/*
 * One record per run of the news agent.
 *
 * Until now a run left nothing behind except console output, so a source that had
 * stopped working (VietnamWorks returned zero jobs for months because its API
 * changed) could not be noticed from the admin console. Each run now stores how
 * every source did, which is what the admin "last fetch" panel and the startup
 * catch-up read.
 */
const sourceSchema = new mongoose.Schema(
  {
    name: String,
    ok: Boolean,
    count: Number,
    ms: Number,
    error: String,
  },
  { _id: false },
)

const fetchRunSchema = new mongoose.Schema(
  {
    trigger: { type: String, default: 'manual' },
    status: { type: String, enum: ['running', 'ok', 'partial', 'failed'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    sources: [sourceSchema],
    perCategory: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalSaved: { type: Number, default: 0 },
    ai: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: String,
  },
  { versionKey: false },
)

fetchRunSchema.index({ startedAt: -1 })
// History is for diagnosing recent behaviour, not an archive.
fetchRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 })

const FetchRun = mongoose.model('FetchRun', fetchRunSchema)

export default FetchRun
