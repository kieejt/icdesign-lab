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

const Document = mongoose.model('Document', documentSchema)

export default Document
