import express from 'express'
import { handleChat } from '../services/chatbot.service.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body
    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    const response = await handleChat(message, history || [])
    return res.json({ response })
  } catch (error) {
    console.error('Chat Route Error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

export default router
