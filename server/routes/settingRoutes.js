import express from 'express'
import Setting from '../models/Setting.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { AUTO_APPROVE_SETTING_KEY } from '../constants/news.js'

const router = express.Router()

// Default contact info if not set in DB
const DEFAULT_CONTACT_INFO = {
  headName: 'Dr. Nguyen Vu Thang',
  addressEn: 'Room C7 - Hanoi University of Science and Technology, 1 Dai Co Viet, Hai Ba Trung, Hanoi, Vietnam',
  addressVi: 'Phòng C7 - Đại học Bách khoa Hà Nội, 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội, Việt Nam',
  email: 'thang.nguyenvu@hust.edu.vn',
  phone: '(84) 916987468',
  mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d575.1658787318516!2d105.84500795607735!3d21.005270151926574!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ad3592853133%3A0x20992b190671769b!2zTmjDoCBDNyAsIMSQ4bqhaSBI4buNYyBCw6FjaCBLaG9hIEjDoCBO4buZaQ!5e0!3m2!1svi!2s!4v1779210986072!5m2!1svi!2s'
}

// @route   GET /api/settings/:key
// @desc    Get setting by key
// @access  Public
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key })
    
    if (!setting) {
      // Return defaults if requested key is contact_info
      if (req.params.key === 'contact_info') {
        return res.json({ key: 'contact_info', value: DEFAULT_CONTACT_INFO })
      }
      if (req.params.key === AUTO_APPROVE_SETTING_KEY) {
        return res.json({ key: AUTO_APPROVE_SETTING_KEY, value: false })
      }
      return res.status(404).json({ message: 'Setting not found' })
    }
    
    res.json(setting)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch setting' })
  }
})

// @route   PUT /api/settings/:key
// @desc    Create or Update setting by key
// @access  Private/Admin
router.put('/:key', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { value } = req.body
    
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true, upsert: true } // upsert creates if not exists
    )
    
    await logAdminAction(req, 'UPDATE_SETTING', `Updated setting: ${req.params.key}`)
    
    res.json(setting)
  } catch (error) {
    res.status(500).json({ message: 'Failed to save setting' })
  }
})

export default router
