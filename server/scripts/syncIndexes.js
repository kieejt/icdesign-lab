/**
 * Creates/updates every index declared on the models, then exits.
 *
 * Production runs with `autoIndex: false` so boots stay fast and a rolling
 * deploy never triggers a surprise index build. Run this once after deploying a
 * schema change:  `npm run sync-indexes`
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'

// Importing the models registers their schemas (and therefore their indexes).
import './registerModels.js'

dotenv.config()

const run = async () => {
  await connectDB()

  const names = Object.keys(mongoose.models)
  console.log(`Syncing indexes for ${names.length} models...`)

  for (const name of names) {
    const result = await mongoose.models[name].syncIndexes()
    console.log(`  ${name}: ${result.length ? `dropped ${result.join(', ')}` : 'up to date'}`)
  }

  await mongoose.disconnect()
  console.log('Index sync complete.')
}

run().catch((err) => {
  console.error('Index sync failed:', err)
  process.exit(1)
})
