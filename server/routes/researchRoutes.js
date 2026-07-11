import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Research from '../models/Research.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { bibtexToResearchFields } from '../utils/bibtex.js'

const router = express.Router()

const BIBTEX_TITLE_ERROR = "Could not extract a title from the BibTeX entry — check for a 'title' field."

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {}
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.max(Number(req.query.limit) || 9, 1)

    const [total, research] = await Promise.all([
      Research.countDocuments(filter),
      Research.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ])

    return res.json({
      data: research,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch research' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, authors, journal, link, image, date, bibtex } = req.body

    if (category === 'Publications') {
      if (!bibtex || !bibtex.trim()) {
        return res.status(400).json({ message: 'BibTeX is required to add a publication' })
      }
      const parsed = bibtexToResearchFields(bibtex, link)
      if (!parsed) {
        return res.status(400).json({ message: BIBTEX_TITLE_ERROR })
      }
      const item = await Research.create({
        title: parsed.title,
        description: parsed.description,
        category,
        authors: parsed.authors,
        journal: parsed.journal,
        link: parsed.link,
        image,
        date: parsed.date,
        bibtex,
      })
      await logAdminAction(req, 'CREATE_RESEARCH', `Created publication: ${item.title}`)
      return res.status(201).json(item)
    }

    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ message: 'Title, description, category are required' })
    }

    const item = await Research.create({ title, description, category, authors, journal, link, image, date })
    await logAdminAction(req, 'CREATE_RESEARCH', `Created project: ${item.title}`)
    return res.status(201).json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create research' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, authors, journal, link, image, date, bibtex } = req.body

    if (category === 'Publications') {
      const updateData = { link: (link || '').trim(), image }

      if (bibtex && bibtex.trim()) {
        const parsed = bibtexToResearchFields(bibtex, link)
        if (!parsed) {
          return res.status(400).json({ message: BIBTEX_TITLE_ERROR })
        }
        Object.assign(updateData, {
          title: parsed.title,
          description: parsed.description,
          authors: parsed.authors,
          journal: parsed.journal,
          date: parsed.date,
          bibtex,
          link: parsed.link,
        })
      }
      // bibtex absent/blank: leave title/description/authors/journal/date/bibtex untouched
      // (only link/image update) so legacy or already-parsed entries aren't blanked out.

      const item = await Research.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
      if (!item) {
        return res.status(404).json({ message: 'Research not found' })
      }
      await logAdminAction(req, 'UPDATE_RESEARCH', `Updated publication: ${item.title}`)
      return res.json(item)
    }

    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ message: 'Title, description, category are required' })
    }

    const item = await Research.findByIdAndUpdate(
      req.params.id,
      { title, description, category, authors, journal, link, image, date },
      { new: true, runValidators: true },
    )

    if (!item) {
      return res.status(404).json({ message: 'Research not found' })
    }

    await logAdminAction(req, 'UPDATE_RESEARCH', `Updated project: ${item.title}`)

    return res.json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update research' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await Research.findByIdAndDelete(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Research not found' })
    }

    const label = item.category === 'Publications' ? 'publication' : 'project'
    await logAdminAction(req, 'DELETE_RESEARCH', `Deleted ${label}: ${item.title}`)

    return res.json({ message: 'Research deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete research' })
  }
})

// Bulk create publications from Link + BibTeX rows (Excel import)
router.post('/bulk', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Invalid payload: rows array is required' })
    }

    const docs = []
    for (const row of rows) {
      const { link, bibtex } = row
      if (!bibtex || !bibtex.trim()) {
        return res.status(400).json({ message: 'Every row must include a BibTeX entry' })
      }
      const parsed = bibtexToResearchFields(bibtex, link)
      if (!parsed) {
        return res.status(400).json({ message: `${BIBTEX_TITLE_ERROR} (row: ${(bibtex || '').slice(0, 60)}...)` })
      }
      docs.push({
        title: parsed.title,
        description: parsed.description,
        category: 'Publications',
        authors: parsed.authors,
        journal: parsed.journal,
        link: parsed.link,
        date: parsed.date,
        bibtex,
      })
    }

    const created = await Research.insertMany(docs)
    await logAdminAction(req, 'BULK_CREATE_PUBLICATIONS', `Bulk imported ${created.length} publications`)
    return res.status(201).json(created)
  } catch (error) {
    console.error('Bulk publication import error:', error)
    return res.status(500).json({ message: 'Failed to bulk import publications' })
  }
})

export default router
