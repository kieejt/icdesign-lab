import mongoose from 'mongoose'

const labEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['Upcoming', 'Past'], default: 'Upcoming' },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('LabEvent', labEventSchema)
