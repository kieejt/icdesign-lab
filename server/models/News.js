import mongoose from 'mongoose'

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    score: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
      },
    ],
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

newsSchema.post('save', async function () {
  const NewsModel = this.constructor
  try {
    const count = await NewsModel.countDocuments()
    if (count > 200) {
      const excess = count - 200
      const oldest = await NewsModel.find({}, '_id').sort({ publishedAt: 1 }).limit(excess)
      const ids = oldest.map((d) => d._id)
      await NewsModel.deleteMany({ _id: { $in: ids } })
      console.log(`[News Schema Hook] Cleaned up ${excess} oldest articles because count reached ${count}`)
    }
  } catch (err) {
    console.error('[News Schema Hook] Cleanup error:', err)
  }
})

const News = mongoose.model('News', newsSchema)

export default News
