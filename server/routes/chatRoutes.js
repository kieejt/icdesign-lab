import express from 'express'
import { handleChat } from '../services/chatbot.service.js'
import { CHAT_LIMITS } from '../constants/chat.js'

const router = express.Router()

/**
 * Keeps only the fields the model needs, in the shape it expects.
 *
 * The client sends back its own transcript, so this is untrusted input: the
 * rate limiter caps how *often* someone can ask, but not how large one request
 * is. Without a cap here a single call could carry a megabyte of "history" and
 * cost more than a hundred normal ones.
 */
function sanitiseHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
    .slice(-CHAT_LIMITS.maxHistoryTurns)
    .map((entry) => ({
      role: entry.role,
      content: String(entry.content ?? '').slice(0, CHAT_LIMITS.maxMessageChars),
    }))
    .filter((entry) => entry.content.length > 0)
}

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body || {}

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' })
    }

    if (message.length > CHAT_LIMITS.maxMessageChars) {
      return res.status(413).json({
        message: `Message is too long (max ${CHAT_LIMITS.maxMessageChars} characters).`,
      })
    }

    const response = await handleChat(message.trim(), sanitiseHistory(history))
    return res.json({ response })
  } catch (error) {
    console.error('Chat Route Error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

export default router
