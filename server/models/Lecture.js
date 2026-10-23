import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    name: { type: String, trim: true, maxlength: 100 },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    name: { type: String, trim: true, maxlength: 100 },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

commentSchema.add({
  replies: [replySchema]
})

const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    youtubeUrl: { type: String, trim: true },
    materialUrl: { type: String, trim: true },
    views: { type: Number, default: 0 },
    comments: [commentSchema]
  },
  { timestamps: true }
)

lectureSchema.index({ createdAt: -1 })
lectureSchema.index({ views: -1 })

const Lecture = mongoose.model('Lecture', lectureSchema)

export default Lecture
