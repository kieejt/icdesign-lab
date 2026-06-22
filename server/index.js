import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import memberRoutes from './routes/memberRoutes.js'
import researchRoutes from './routes/researchRoutes.js'
import recruitmentRoutes from './routes/recruitmentRoutes.js'
import newsRoutes from './routes/newsRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import labEventRoutes from './routes/labEventRoutes.js'
import galleryRoutes from './routes/galleryRoutes.js'
import lectureRoutes from './routes/lectureRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import settingRoutes from './routes/settingRoutes.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { startNewsCronJob } from './jobs/cron.js'

dotenv.config()
connectDB()

const app = express()

// 1. Enforce Secure HTTP Response Headers using Helmet
app.use(helmet())

// 2. Configure CORS securely
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS not allowed by security policy'))
    },
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

// 3. Configure Rate Limiting to prevent brute-forcing and Denial of Service (DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again after 15 minutes.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
})

// Apply rate limiting
app.use('/api', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running securely' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/research', researchRoutes)
app.use('/api/recruitment', recruitmentRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/lab-events', labEventRoutes)
app.use('/api/gallery', galleryRoutes)
app.use('/api/lectures', lectureRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/settings', settingRoutes)

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const PORT = process.env.PORT || 5000

// Initialize cron jobs
startNewsCronJob()

app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`)
})
