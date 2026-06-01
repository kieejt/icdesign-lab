import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
)

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    text: { type: String, required: true },
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

const Lecture = mongoose.model('Lecture', lectureSchema)

export default Lecture
