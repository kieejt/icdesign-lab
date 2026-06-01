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

const PageView = mongoose.model('PageView', pageViewSchema)

export default PageView
