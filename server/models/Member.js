import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Professors', 'Students', 'Alumni'], default: 'Students' },
    email: { type: String, required: true, trim: true, lowercase: true },
    research: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

const Member = mongoose.model('Member', memberSchema)

export default Member
