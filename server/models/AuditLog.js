import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "CREATE_DOCUMENT", "REVOKE_STUDENT"
    details: { type: String, required: true }, // e.g. "Created document 'Intro to HDL'"
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  },
)

// The audit view is a reverse-chronological feed, optionally filtered by action.
auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
