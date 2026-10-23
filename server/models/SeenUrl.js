import mongoose from 'mongoose'

/*
 * URLs the news agent has already handled, kept independently of the News
 * collection.
 *
 * News is pruned to its newest 200 documents, and a rejected article is pruned
 * with the rest. Once it was gone the agent could no longer tell it had seen it,
 * so a rejected article that was still in a feed came back as "new" and landed in
 * the review queue again. This collection remembers every URL that was saved, for
 * long enough that the article has left the feeds.
 */
const seenUrlSchema = new mongoose.Schema(
  {
    // The canonical URL itself: short, unique by construction, and no hash to maintain.
    _id: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
)

// Feeds list articles for days to a few weeks; 60 days is comfortably past that.
seenUrlSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 })

const SeenUrl = mongoose.model('SeenUrl', seenUrlSchema)

export default SeenUrl
