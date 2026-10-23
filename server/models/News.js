import mongoose from 'mongoose'

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    source: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    thumbnail: { type: String },
    score: { type: Number, default: 0 },
    // 0-10 relevance judged by the AI ranker; null when it was unavailable.
    relevance: { type: Number, default: null },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    category: {
      type: String,
      enum: ['World News', 'Vietnam News', 'Jobs'],
      default: 'World News',
    },
  },
  { timestamps: true }
)

// The public feed always filters on status (+ optionally category) and sorts by
// createdAt; the admin queues do the same with a different status. One compound
// index covers every one of those access patterns as an index-only scan.
newsSchema.index({ status: 1, category: 1, createdAt: -1 })
// Date-range filtering on the public feed and the "prune oldest" cleanup.
newsSchema.index({ status: 1, publishedAt: -1 })
newsSchema.index({ publishedAt: 1 })

/**
 * Trim the collection down to `limit` newest articles.
 *
 * This used to run as a post('save') hook, which meant a full countDocuments()
 * on every single article the scraper wrote — O(n) writes per fetch run. It is
 * now called once, after a fetch batch completes.
 */
newsSchema.statics.pruneToLimit = async function pruneToLimit(limit = 200) {
  const count = await this.countDocuments()
  if (count <= limit) return 0

  const excess = count - limit
  const oldest = await this.find({}, '_id').sort({ publishedAt: 1 }).limit(excess).lean()
  if (oldest.length === 0) return 0

  await this.deleteMany({ _id: { $in: oldest.map((d) => d._id) } })
  return oldest.length
}

const News = mongoose.model('News', newsSchema)

export default News
