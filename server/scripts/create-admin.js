/**
 * Creates the first admin account, then exits.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run create-admin
 *
 * In the production container:
 *   docker exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... icdesign-backend node scripts/create-admin.js
 *
 * The credentials come from the environment, not argv, so they stay out of the
 * process list. It refuses to run once an admin exists.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

import connectDB from '../config/db.js'
import User from '../models/User.js'

dotenv.config()

const MIN_PASSWORD_LENGTH = 10

const run = async () => {
  const email = process.env.ADMIN_EMAIL?.trim()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.')
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  await connectDB()

  if (await User.exists({ role: 'admin' })) {
    throw new Error('An admin account already exists. Nothing was changed.')
  }

  const user = await User.create({ email, password, role: 'admin' })
  console.log(`Admin account created for ${user.email}.`)

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
