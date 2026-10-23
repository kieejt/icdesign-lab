import mongoose from 'mongoose'

/**
 * The calendar day of an event is stored as a real date (UTC midnight of that
 * day). Older events only have `date`, free text typed by an admin; they keep
 * working and are converted the next time someone edits them.
 */
const labEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    /** First day of the event. */
    eventDate: { type: Date },
    /** Last day of a multi-day event; absent for a single day. */
    endDate: { type: Date },
    /** Human-readable date. Derived from `eventDate` on save; the only date old events have. */
    date: { type: String, required: true, trim: true, maxlength: 60 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    /** Stored for older readers; for dated events the routes compute it from the date. */
    status: { type: String, required: true, enum: ['Upcoming', 'Past'], default: 'Upcoming' },
    /** No longer entered (an event is its title, date and place); kept for events saved before. */
    description: { type: String, trim: true, maxlength: 5000 },
  },
  { timestamps: true }
)

const formatDay = (date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)

labEventSchema.pre('validate', function deriveDate() {
  if (!this.eventDate) return
  this.date = this.endDate && this.endDate > this.eventDate
    ? `${formatDay(this.eventDate)} – ${formatDay(this.endDate)}`
    : formatDay(this.eventDate)
})

labEventSchema.index({ status: 1, createdAt: -1 })
labEventSchema.index({ createdAt: -1 })
labEventSchema.index({ eventDate: -1, createdAt: -1 })

export default mongoose.model('LabEvent', labEventSchema)
