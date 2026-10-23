import cron from 'node-cron'

import Setting from '../models/Setting.js'
import { CATCH_UP_AFTER_MS } from '../constants/news.js'
import { lastSuccessfulRun, recoverStaleRuns, runNewsFetch } from '../services/agent.service.js'

/*
 * Schedule for the daily news fetch.
 *
 * This used to live in `server/config/cronTime.json`, written with
 * fs.writeFileSync. That file is tracked in git and the deploy does
 * `git reset --hard origin/main`, so an admin changing the schedule through the
 * console had it silently reverted on the next deploy — and the file is baked
 * into the image rather than a volume, so a rebuild lost it too.
 *
 * It is a setting, so it belongs in the settings collection with every other
 * one. That also makes it correct across more than one API process, which a
 * file on a container's own disk never could be.
 */

const CRON_SETTING_KEY = 'news_cron_time'

const DEFAULT_TIME = { hour: 8, minute: 0 }

/** The lab is in Vietnam; the schedule means local time there, not the server's. */
const TIMEZONE = 'Asia/Ho_Chi_Minh'

let currentTask = null

/** Clamps a stored value into a real time, so bad data cannot break the schedule. */
function normalise(value) {
  const hour = Number(value?.hour)
  const minute = Number(value?.minute)

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return DEFAULT_TIME
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return DEFAULT_TIME

  return { hour, minute }
}

/**
 * Reads the configured run time.
 *
 * @returns {Promise<{hour: number, minute: number}>}
 */
export async function getCronTime() {
  try {
    const setting = await Setting.findOne({ key: CRON_SETTING_KEY }).lean()
    return normalise(setting?.value)
  } catch (error) {
    console.error('Failed to read the news cron schedule:', error.message)
    return DEFAULT_TIME
  }
}

const formatTime = ({ hour, minute }) => `${hour}:${String(minute).padStart(2, '0')}`

/** (Re)schedules the daily fetch from whatever is currently stored. */
export async function startNewsCronJob() {
  if (currentTask) {
    currentTask.stop()
    currentTask = null
  }

  const time = await getCronTime()

  currentTask = cron.schedule(
    `${time.minute} ${time.hour} * * *`,
    async () => {
      console.log(`Running the daily news fetch (${formatTime(time)} ${TIMEZONE})...`)
      // runNewsFetch takes a cross-process lock, so only one instance actually
      // fetches even when several have the same schedule.
      await runNewsFetch('cron')
    },
    { timezone: TIMEZONE },
  )

  console.log(`News fetch scheduled daily at ${formatTime(time)} (${TIMEZONE}).`)
  return time
}

/**
 * Stores a new run time and reschedules.
 *
 * @returns {Promise<boolean>} whether it was accepted
 */
export async function updateCronTime(hour, minute) {
  const time = normalise({ hour, minute })

  // normalise() falls back to the default on bad input; reject rather than
  // silently storing something the caller did not ask for.
  if (time.hour !== hour || time.minute !== minute) return false

  try {
    await Setting.findOneAndUpdate(
      { key: CRON_SETTING_KEY },
      { value: time },
      { upsert: true, returnDocument: 'after' },
    )
    await startNewsCronJob()
    return true
  } catch (error) {
    console.error('Failed to store the news cron schedule:', error.message)
    return false
  }
}

/**
 * Runs a fetch shortly after boot when the last good one is too old.
 *
 * node-cron only fires while the process is alive at the scheduled minute, so a
 * restart across it (a deploy, a crash, a host reboot) silently skipped that day's
 * fetch. The check is against the last successful run, not the clock time, so it
 * also covers a server that was off for days. Off by default outside production,
 * so restarting a dev server does not scrape the web and spend AI calls.
 */
export async function catchUpIfMissed() {
  try {
    await recoverStaleRuns()

    if (process.env.NEWS_CATCH_UP !== 'true' && process.env.NODE_ENV !== 'production') return false
    if (process.env.NEWS_CATCH_UP === 'false') return false

    const last = await lastSuccessfulRun()
    const age = last ? Date.now() - new Date(last.startedAt).getTime() : Infinity
    if (age < CATCH_UP_AFTER_MS) return false

    console.log(`The last successful news fetch is ${last ? `${Math.round(age / 3_600_000)} h` : 'missing'} old — catching up.`)
    // A short delay so the server finishes starting before it starts scraping.
    setTimeout(() => runNewsFetch('catch-up'), 60_000).unref?.()
    return true
  } catch (error) {
    console.error('News catch-up check failed:', error.message)
    return false
  }
}

/** Stops the scheduled task. Used on shutdown. */
export function stopNewsCronJob() {
  currentTask?.stop()
  currentTask = null
}
