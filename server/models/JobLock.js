import mongoose from 'mongoose'

/**
 * A lease held by whichever process is currently running a background job.
 *
 * The news fetch scrapes a few dozen sources and sends them through a paid AI
 * summariser. Every API process schedules it, so with more than one instance
 * they would all wake at the same minute and do the same work — duplicate
 * scrapes, duplicate AI spend, and a pile of duplicate-key errors racing each
 * other into the news collection.
 *
 * A lease rather than a plain flag: if the holder crashes mid-run it would
 * otherwise stay locked forever. `expiresAt` lets the next run take over once
 * the lease lapses, and the TTL index eventually removes the row.
 */
const jobLockSchema = new mongoose.Schema(
  {
    // The job name is the primary key, so the unique index that enforces
    // mutual exclusion is the one MongoDB creates anyway.
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    acquiredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
)

// Housekeeping only — the lock logic relies on comparing expiresAt, not on the
// TTL monitor, which runs about once a minute and is far too coarse to trust.
jobLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 })

const JobLock = mongoose.model('JobLock', jobLockSchema)

export default JobLock
