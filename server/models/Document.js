import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    isLabOwned: { type: Boolean, default: false },
    downloadUrl: { type: String, trim: true },
    type: { type: String, required: true, enum: ['Free', 'Paid'], default: 'Free' },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// The catalog filters on any combination of type / subject / ownership and
// sorts newest-first; these cover the common shapes.
documentSchema.index({ createdAt: -1 })
documentSchema.index({ type: 1, isLabOwned: 1, createdAt: -1 })
documentSchema.index({ subject: 1 })
documentSchema.index({ downloads: -1 })

const Document = mongoose.model('Document', documentSchema)

export default Document
