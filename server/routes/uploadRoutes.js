import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// Map mimetypes to safe extensions
const mimeToExt = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
}

// Multer never creates its destination folder itself, and a fresh container
// image doesn't have one (uploads/ is gitignored) — create it up front.
const uploadDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = mimeToExt[file.mimetype] || '.bin'
    cb(null, 'img-' + uniqueSuffix + ext)
  }
})

// Check file type to allow only images
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|webp|gif/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)

  if (extname && mimetype) {
    return cb(null, true)
  } else {
    cb(new Error('Images only!'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb)
  }
})


// Longest edge kept after upload. Phone cameras produce 4000px+ photos that no
// page on this site ever shows at full size.
const MAX_DIMENSION = 2000

/**
 * Re-encodes an uploaded image as WebP, capped at MAX_DIMENSION, and removes the
 * original. Returns the final file name. GIFs are left alone (re-encoding would
 * drop the animation) and a file sharp cannot decode is kept as uploaded.
 */
async function optimizeUpload(file) {
  if (file.mimetype === 'image/gif') return file.filename

  const parsed = path.parse(file.path)
  const optimizedName = `${parsed.name}.webp`
  const optimizedPath = path.join(parsed.dir, optimizedName)

  try {
    await sharp(file.path)
      .rotate() // honour EXIF orientation before the metadata is stripped
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(optimizedPath)
    await fs.promises.unlink(file.path)
    return optimizedName
  } catch (error) {
    console.error('Image optimisation failed, keeping original:', error.message)
    return file.filename
  }
}

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private/Admin
router.post('/', verifyToken, verifyAdmin, (req, res) => {
  upload.single('image')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const filename = await optimizeUpload(req.file)

    // Return the URL path
    res.json({
      message: 'Image uploaded successfully',
      url: `/uploads/${filename}`
    })
  })
})

// @route   POST /api/upload/batch
// @desc    Upload multiple images (max 50)
// @access  Private/Admin
router.post('/batch', verifyToken, verifyAdmin, (req, res) => {
  upload.array('images', 50)(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' })
    }

    // One at a time: 50 parallel decodes of multi-megapixel photos would spike memory.
    const urls = []
    for (const file of req.files) {
      urls.push(`/uploads/${await optimizeUpload(file)}`)
    }

    res.json({
      message: 'Images uploaded successfully',
      urls: urls
    })
  })
})

export default router
