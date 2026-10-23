import mongoose from 'mongoose'
import os from 'os'

import JobLock from '../models/JobLock.js'

/** Identifies which process holds a lease, for diagnostics. */
const OWNER = `${os.hostname()}:${process.pid}`

/** Mongo's duplicate-key error. Here it means somebody else holds the lease. */
const DUPLICATE_KEY = 11000

/**
 * Claims `name` for `ttlMs`, or returns null when someone else holds it.
 *
 * The claim is a single atomic upsert: either this process writes the lease
 * document or it collides with the existing one. There is no read-then-write
 * window for two instances to both pass.
 *
 * @param {string} name   job identifier
 * @param {number} ttlMs  how long the lease is held before it can be taken over
 * @returns {Promise<null | (() => Promise<void>)>} a function that releases the lease
 */
export async function acquireJobLock(name, ttlMs) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  try {
    await JobLock.findOneAndUpdate(
      // Matches when the lock is absent, or present but lapsed. A live lease
      // matches neither, so the upsert collides on _id and throws instead.
      { _id: name, expiresAt: { $lte: now } },
      { $set: { owner: OWNER, acquiredAt: now, expiresAt } },
      { upsert: true, returnDocument: 'after' },
    )
  } catch (error) {
    if (error?.code === DUPLICATE_KEY) {
      console.log(`[${name}] Another process holds the lock; skipping this run.`)
      return null
    }
    throw error
  }

  // Release only if the lease is still ours — a long overrun may already have
  // been taken over, and releasing then would cut the new holder's run short.
  return async () => {
    try {
      await JobLock.deleteOne({ _id: name, owner: OWNER })
    } catch (error) {
      console.error(`[${name}] Failed to release the lock:`, error.message)
    }
  }
}

export async function withJobLock(name, ttlMs, task) {
  const release = await acquireJobLock(name, ttlMs)
  if (!release) return { ran: false }

  try {
    const result = await task()
    return { ran: true, result }
  } finally {
    await release()
  }
}

/** True when a job is currently claimed by anyone. */
export async function isJobRunning(name) {
  const lock = await JobLock.findOne({ _id: name, expiresAt: { $gt: new Date() } }).lean()
  return Boolean(lock)
}

export default withJobLock
