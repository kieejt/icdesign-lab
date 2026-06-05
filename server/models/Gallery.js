import mongoose from 'mongoose'

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    coverImage: { type: String, trim: true },
    images: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.model('Gallery', gallerySchema)
