import mongoose from 'mongoose'

/*
 * A rate-limit store backed by MongoDB.
 *
 * express-rate-limit defaults to an in-memory store, which counts per process.
 * That is correct for one instance and quietly wrong for more than one: with N
 * API containers the effective limit becomes N times what was configured, so a
 * login lockout of 20 attempts turns into 20N and the protection thins out
 * exactly as the deployment grows.
 *
 * Mongo is already a dependency, so this needs no new infrastructure. It is
 * applied only to the low-volume, security-relevant limiters — putting a
 * database write in front of *every* API request would trade a real latency
 * cost for a guarantee those coarse limits do not need.
 */

const collectionName = 'ratelimits'

/** Lazily created so the model is registered once, on first use. */
let model = null

function getModel() {
  if (model) return model

  const schema = new mongoose.Schema(
    {
      _id: String,
      hits: { type: Number, default: 0 },
      expiresAt: { type: Date, required: true },
    },
    { versionKey: false, collection: collectionName },
  )

  // Housekeeping for windows nobody comes back to. The limiter does not rely on
  // this: the TTL monitor runs roughly once a minute, far too coarse to decide
  // whether a window has rolled over. `expiresAt` is compared explicitly below.
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

  model = mongoose.models[collectionName] || mongoose.model(collectionName, schema)
  return model
}

/**
 * Store implementing the express-rate-limit v8 interface.
 *
 * @see https://express-rate-limit.mintlify.app/reference/stores
 */
export default class MongoRateLimitStore {
  /** Told to the limiter so it knows counts are shared, not per-process. */
  localKeys = false

  /** Set from the limiter's own options in `init`. */
  windowMs = 60_000

  /** @param {{prefix?: string}} [options] namespace, so two limiters never share a counter */
  constructor({ prefix = 'rl' } = {}) {
    this.prefix = prefix
  }

  init(options) {
    this.windowMs = options.windowMs
  }

  key(key) {
    return `${this.prefix}:${key}`
  }

  /**
   * Counts one hit and returns the running total for the current window.
   *
   * Done as a single atomic upsert. A read-then-write would let two concurrent
   * requests both observe the same count and both be allowed through, which is
   * precisely the race a login limiter exists to stop.
   */
  async increment(key) {
    const Model = getModel()
    const now = new Date()
    const id = this.key(key)

    // Roll the window over first: clearing a lapsed document and starting from
    // zero is what makes the limit a *window* rather than a lifetime total.
    await Model.deleteOne({ _id: id, expiresAt: { $lte: now } })

    const doc = await Model.findOneAndUpdate(
      { _id: id },
      {
        $inc: { hits: 1 },
        $setOnInsert: { expiresAt: new Date(now.getTime() + this.windowMs) },
      },
      { upsert: true, returnDocument: 'after', lean: true },
    )

    return { totalHits: doc.hits, resetTime: doc.expiresAt }
  }

  /** Used by `skipSuccessfulRequests` to refund a request that should not count. */
  async decrement(key) {
    const Model = getModel()
    await Model.updateOne({ _id: this.key(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } })
  }

  async resetKey(key) {
    const Model = getModel()
    await Model.deleteOne({ _id: this.key(key) })
  }

  async resetAll() {
    const Model = getModel()
    await Model.deleteMany({ _id: new RegExp(`^${this.prefix}:`) })
  }
}
