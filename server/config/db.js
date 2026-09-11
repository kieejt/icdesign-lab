import mongoose from 'mongoose'

/**
 * Connects to MongoDB with a tuned pool and fail-fast timeouts.
 *
 * The defaults are fine for a laptop but poor for a small always-on VPS: an
 * unbounded wait on server selection turns a brief network blip into requests
 * that hang until the client gives up, and `autoIndex` re-checks every index on
 * every boot, which is wasted work once the collections are large.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set — refusing to start.')
    process.exit(1)
  }

  // Mongoose 7+ ignores unknown query fields silently; strict mode surfaces typos.
  mongoose.set('strictQuery', true)

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      // Index creation belongs in a deploy step, not in the hot path of every boot.
      autoIndex: process.env.NODE_ENV !== 'production',
      compressors: ['zlib'],
    })

    console.log(`MongoDB connected: ${conn.connection.host}`)

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message)
    })
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected — driver will retry automatically.')
    })

    return conn
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB
