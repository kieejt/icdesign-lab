import mongoose from 'mongoose'

const pageViewSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    url: { type: String, required: true },
    userAgent: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
)

// Analytics only ever looks at recent windows and groups by url or ip.
pageViewSchema.index({ url: 1, createdAt: -1 })
pageViewSchema.index({ ip: 1, createdAt: -1 })

// Raw hits are only useful for the rolling 30-day dashboard. Expiring them keeps
// the collection bounded instead of growing without limit forever. This index
// also serves every createdAt range query, so there is deliberately no separate
// createdAt index: a second one only added a write to every page view.
pageViewSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 },
)

const PageView = mongoose.model('PageView', pageViewSchema)

export default PageView
