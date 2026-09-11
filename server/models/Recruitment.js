import mongoose from 'mongoose'

const recruitmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    googleFormUrl: { type: String, required: true, trim: true },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true },
)

recruitmentSchema.pre('save', function setStatusByDeadline() {
  if (this.deadline && new Date(this.deadline) < new Date()) {
    this.status = 'closed'
  }
})

// Listings are newest-first; the expiry sweep matches on deadline + status.
recruitmentSchema.index({ createdAt: -1 })
recruitmentSchema.index({ deadline: 1, status: 1 })

const Recruitment = mongoose.model('Recruitment', recruitmentSchema)

export default Recruitment
