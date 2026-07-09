import cron from 'node-cron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchAndProcessNews } from '../services/agent.service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configPath = path.join(__dirname, '../config/cronTime.json')

let currentTask = null

export const getCronTime = () => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('Error reading cron time config', err)
  }
  return { hour: 8, minute: 0 }
}

export const startNewsCronJob = () => {
  if (currentTask) {
    currentTask.stop()
  }

  const { hour, minute } = getCronTime()

  // Run every day at configured time, interpreted in Vietnam time (GMT+7) regardless of the
  // server's own local timezone.
  currentTask = cron.schedule(
    `${minute} ${hour} * * *`,
    async () => {
      console.log(`Running daily news cron job at ${hour}:${minute.toString().padStart(2, '0')} (Asia/Ho_Chi_Minh)...`)
      await fetchAndProcessNews()
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  )

  console.log(`News cron job initialized. Scheduled to run every day at ${hour}:${minute.toString().padStart(2, '0')} Vietnam time (Asia/Ho_Chi_Minh).`)
}

export const updateCronTime = (hour, minute) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ hour, minute }, null, 2))
    startNewsCronJob()
    return true
  } catch (err) {
    console.error('Error writing cron time config', err)
    return false
  }
}
