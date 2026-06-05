import express from 'express'
import multer from 'multer'
import path from 'path'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'

const router = express.Router()

// Map mimetypes to safe extensions
const mimeToExt = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
}

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
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

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private/Admin
router.post('/', verifyToken, verifyAdmin, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Return the URL path
    res.json({
      message: 'Image uploaded successfully',
      url: `/uploads/${req.file.filename}`
    })
  })
})

// @route   POST /api/upload/batch
// @desc    Upload multiple images (max 50)
// @access  Private/Admin
router.post('/batch', verifyToken, verifyAdmin, (req, res) => {
  upload.array('images', 50)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' })
    }

    const urls = req.files.map(file => `/uploads/${file.filename}`)

    res.json({
      message: 'Images uploaded successfully',
      urls: urls
    })
  })
})

export default router
