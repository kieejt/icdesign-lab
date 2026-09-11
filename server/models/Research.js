import mongoose from 'mongoose'

const researchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    authors: { type: String, trim: true },
    journal: { type: String, trim: true },
    link: { type: String, trim: true },
    image: { type: String, trim: true },
    date: { type: Date },
    bibtex: { type: String, trim: true },
  },
  { timestamps: true },
)

// Projects and Publications are always read as "one category, newest first".
researchSchema.index({ category: 1, createdAt: -1 })
researchSchema.index({ category: 1, date: -1 })

const Research = mongoose.model('Research', researchSchema)

export default Research
