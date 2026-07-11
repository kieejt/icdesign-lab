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

const Research = mongoose.model('Research', researchSchema)

export default Research
