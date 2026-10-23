import path from 'path'
import { fileURLToPath } from 'url'

import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'

import connectDB from './config/db.js'
import { startNewsCronJob, stopNewsCronJob } from './jobs/cron.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import imageVariants from './middleware/imageVariants.js'
import MongoRateLimitStore from './middleware/mongoRateLimitStore.js'
import Document from './models/Document.js'
import Member from './models/Member.js'

import analyticsRoutes, { flushPageViews } from './routes/analyticsRoutes.js'
import authRoutes from './routes/authRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import galleryRoutes from './routes/galleryRoutes.js'
import homeRoutes from './routes/homeRoutes.js'
import labEventRoutes from './routes/labEventRoutes.js'
import lectureRoutes from './routes/lectureRoutes.js'
import memberRoutes from './routes/memberRoutes.js'
import newsRoutes from './routes/newsRoutes.js'
import recruitmentRoutes from './routes/recruitmentRoutes.js'
import researchRoutes from './routes/researchRoutes.js'
import seoRoutes from './routes/seoRoutes.js'
import settingRoutes from './routes/settingRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config()

/*
 * The scheduler reads its run time from the settings collection, so it can only
 * start once the database is connected. Previously both were fired off without
 * awaiting anything, which happened to work while the schedule came from a file
 * on disk.
 */
const databaseReady = connectDB()

const app = express()
const isProd = process.env.NODE_ENV === 'production'

/** Opt-in: the assistant stays off unless explicitly switched on. */
const CHATBOT_ENABLED = process.env.CHATBOT_ENABLED === 'true'

// Behind nginx/Render/Railway the client IP arrives in X-Forwarded-For. Without
// this, rate limiting and analytics would see the proxy's IP for every visitor.
app.set('trust proxy', 1)

// Express's default weak ETag on JSON lets browsers revalidate with a cheap 304
// instead of re-downloading an unchanged payload.
app.set('etag', 'strong')

// 1. Security headers.
app.use(
  helmet({
    // Images live on this origin but are rendered by the frontend origin; the
    // default 'same-origin' policy would block them.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // The API serves JSON and uploads, not HTML, so a CSP here buys nothing and
    // only risks breaking the static /uploads mount. The frontend sets its own.
    contentSecurityPolicy: false,
  }),
)

// 2. Compression — the single biggest transfer-size win for JSON list endpoints.
app.use(
  compression({
    threshold: 1024, // don't waste CPU gzipping tiny responses
    filter: (req, res) => (req.headers['x-no-compression'] ? false : compression.filter(req, res)),
  }),
)

// 3. CORS.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/**
 * Decides whether a browser origin may call the API with credentials.
 *
 * An unconfigured allowlist used to mean "allow every origin". Combined with
 * `credentials: true` that let any website on the internet call this API with
 * the visitor's session cookie attached. An empty allowlist now means the
 * opposite — nothing cross-origin is permitted — so a missing CORS_ORIGINS is a
 * visible misconfiguration rather than a silent hole.
 *
 * Requests with no Origin header still pass: that covers same-origin navigation
 * (how production actually serves the API, behind nginx), curl, and uptime
 * probes. None of those are the cross-site request this guards against.
 */
function isOriginAllowed(origin) {
  if (!origin) return true
  if (allowedOrigins.includes(origin)) return true

  // Local dev runs the client on a Vite port against this server directly.
  if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true

  return false
}

if (isProd && allowedOrigins.length === 0) {
  console.warn(
    'CORS_ORIGINS is not set. Cross-origin browser requests will be refused. ' +
      'This is correct when the frontend is served from the same origin (nginx), ' +
      'and wrong if the frontend is on its own domain.',
  )
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true)
      return callback(new Error('CORS not allowed by security policy'))
    },
    credentials: true,
    maxAge: 86400, // let browsers cache the preflight for a day
  }),
)

// A bounded body size stops a single oversized JSON payload from exhausting memory.
// text/plain is parsed as JSON too: navigator.sendBeacon (used for analytics)
// can only send CORS-safelisted content types, and cannot survive a preflight.
app.use(express.json({ limit: '1mb', type: ['application/json', 'text/plain'] }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())

// 4. Rate limiting.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Analytics beacons fire on every navigation and must never eat a visitor's
  // budget for real API calls.
  skip: (req) => req.path === '/analytics/track',
  message: { message: 'Too many requests, please try again after 15 minutes.' },
})

/*
 * Sign-in attempts are counted in the database, not in this process's memory.
 *
 * The general apiLimiter above deliberately stays in memory: it is a coarse
 * flood guard where being N times looser across N instances is acceptable, and
 * a database write in front of every request is not. A brute-force lockout is
 * the opposite — it is the control itself, it sees very little traffic, and it
 * has to hold no matter which instance answers.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward a lockout
  store: new MongoRateLimitStore({ prefix: 'auth' }),
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
})

/*
 * The chat endpoint bills real money.
 *
 * It is unauthenticated by design — visitors should be able to ask the
 * assistant a question — but every call is a Groq completion, so without its
 * own budget a single script can drain the API quota. The general apiLimiter
 * (1000 requests / 15 min) is far too generous for that.
 */
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  // Shared for the same reason as the auth limiter: it is a spending cap, and a
  // cap that multiplies by the number of running instances is not a cap.
  store: new MongoRateLimitStore({ prefix: 'chat' }),
  message: { message: 'Too many messages. Please wait a few minutes before asking again.' },
})

app.use('/api', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
if (CHATBOT_ENABLED) app.use('/api/chat', chatLimiter)

// Health check — never cached, so uptime probes always see live status.
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

// API routes.
app.use('/api/auth', authRoutes)
app.use('/api/home', homeRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/research', researchRoutes)
app.use('/api/recruitment', recruitmentRoutes)
app.use('/api/news', newsRoutes)
/*
 * The chatbot is off.
 *
 * It was an experiment, and every message is a paid Groq completion on an
 * endpoint that has to stay unauthenticated to be useful. Rather than delete
 * the code, the route is gated: set CHATBOT_ENABLED=true to bring it back.
 *
 * A disabled route answers 503 rather than 404 so that, if the widget is ever
 * re-enabled on the client without the server, the cause is obvious.
 */
if (CHATBOT_ENABLED) {
  app.use('/api/chat', chatRoutes)
} else {
  app.use('/api/chat', (req, res) =>
    res.status(503).json({ message: 'The assistant is currently disabled.' }),
  )
}
app.use('/api/lab-events', labEventRoutes)
app.use('/api/gallery', galleryRoutes)
app.use('/api/lectures', lectureRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/seo', seoRoutes)

// Uploaded images are content-addressed by a random filename and never rewritten
// in place, so they can be cached hard and forever.
const uploadDir = path.join(__dirname, 'uploads')
app.use('/uploads', imageVariants(uploadDir))
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    lastModified: true,
    index: false,
    setHeaders(res) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable')
    },
  }),
)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

databaseReady
  .then(async () => {
    // Documents written before search tokens existed would otherwise be
    // invisible to search. Cheap no-op once everything is filled in.
    for (const Model of [Member, Document]) {
      const filled = await Model.backfillSearchTokens().catch((error) => {
        console.error(`Search backfill failed for ${Model.modelName}:`, error.message)
        return 0
      })
      if (filled) console.log(`Backfilled search tokens on ${filled} ${Model.modelName} documents.`)
    }
  })
  .then(() => startNewsCronJob())
  .catch((error) => {
    // A failed scheduler must not take the API down with it: the site is
    // readable without the news agent ever running.
    console.error('Could not start the news scheduler:', error.message)
  })

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`)
})

// Finish in-flight requests before exiting so a deploy doesn't drop connections.
const shutdown = (signal) => {
  console.log(`${signal} received — shutting down gracefully...`)
  stopNewsCronJob()
  setTimeout(() => process.exit(1), 10_000).unref()
  // Buffered page views are written before the connection goes away.
  server.close(() => {
    console.log('HTTP server closed.')
    flushPageViews().finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})
