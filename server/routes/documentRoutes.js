import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Document from '../models/Document.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', owned } = req.query
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.max(Number(limit) || 10, 1)

    const filter = {}
    if (req.query.type) filter.type = req.query.type
    if (req.query.subject) filter.subject = req.query.subject
    if (owned === 'Owned') filter.isLabOwned = true
    else if (owned === 'External') filter.isLabOwned = false
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      filter.$or = [{ title: regex }, { subject: regex }]
    }

    const [total, documents] = await Promise.all([
      Document.countDocuments(filter),
      Document.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ])

    return res.json({
      data: documents,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
      currentPage: pageNum,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch documents' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, subject, link, isLabOwned, downloadUrl, type } = req.body
    if (!title || !subject || !link) {
      return res
        .status(400)
        .json({ message: 'Title, subject, and link are required' })
    }

    const document = await Document.create({
      title,
      subject,
      link,
      isLabOwned: !!isLabOwned,
      downloadUrl: isLabOwned ? downloadUrl : undefined,
      type: type || 'Free'
    })
    await logAdminAction(req, 'CREATE_DOCUMENT', `Created document: ${document.title} (${document.subject})`)
    return res.status(201).json(document)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create document' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, subject, link, isLabOwned, downloadUrl, type } = req.body
    if (!title || !subject || !link) {
      return res
        .status(400)
        .json({ message: 'Title, subject, and link are required' })
    }

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        title,
        subject,
        link,
        isLabOwned: !!isLabOwned,
        downloadUrl: isLabOwned ? downloadUrl : undefined,
        type: type || 'Free',
      },
      { new: true, runValidators: true },
    )

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    await logAdminAction(req, 'UPDATE_DOCUMENT', `Updated document: ${document.title} (${document.subject})`)
    return res.json(document)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update document' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    await logAdminAction(req, 'DELETE_DOCUMENT', `Deleted document: ${document.title}`)
    return res.json({ message: 'Document deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete document' })
  }
})

// Bulk create documents
router.post('/bulk', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const documents = req.body
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'Invalid payload: documents array is required' })
    }

    const validDocs = []
    for (const doc of documents) {
      const { title, subject, link, isLabOwned, downloadUrl, type } = doc
      if (!title || !subject || !link) {
        return res.status(400).json({ message: 'Title, subject, and link are required for all documents' })
      }
      if (isLabOwned && !downloadUrl) {
        return res.status(400).json({ message: 'Download URL is required for lab-owned books' })
      }
      validDocs.push({
        title: title.trim(),
        subject: subject.trim(),
        link: link.trim(),
        isLabOwned: !!isLabOwned,
        downloadUrl: isLabOwned ? downloadUrl.trim() : undefined,
        type: type || 'Free'
      })
    }

    const createdDocuments = await Document.insertMany(validDocs)
    await logAdminAction(req, 'BULK_CREATE_DOCUMENTS', `Bulk imported ${createdDocuments.length} documents`)
    return res.status(201).json(createdDocuments)
  } catch (error) {
    console.error('Bulk upload error:', error)
    return res.status(500).json({ message: 'Failed to bulk import documents' })
  }
})

// Bulk delete documents
router.post('/bulk-delete', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid payload: ids array is required' })
    }

    await Document.deleteMany({ _id: { $in: ids } })
    await logAdminAction(req, 'BULK_DELETE_DOCUMENTS', `Bulk deleted ${ids.length} documents`)
    return res.json({ message: `${ids.length} documents deleted successfully` })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return res.status(500).json({ message: 'Failed to delete selected documents' })
  }
})

// Record download for a document
router.post('/:id/download', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    )
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    return res.json({ downloadUrl: document.downloadUrl })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record download' })
  }
})

export default router

