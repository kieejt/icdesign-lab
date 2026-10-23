/**
 * Collects how each source did during one run of the news agent.
 *
 * Every scraper reports through `trackSource`, so a source that fails, returns
 * nothing or hits its time budget shows up in the run record instead of only in a
 * log line nobody reads.
 */
export class RunReport {
  constructor() {
    this.sources = []
  }

  /** @param {{name: string, ok: boolean, count?: number, ms?: number, error?: string}} entry */
  addSource({ name, ok, count = 0, ms = 0, error }) {
    this.sources.push({ name, ok, count, ms, ...(error ? { error: String(error).slice(0, 200) } : {}) })
  }

  get failed() {
    return this.sources.filter((source) => !source.ok)
  }

  get empty() {
    return this.sources.filter((source) => source.ok && source.count === 0)
  }
}

/**
 * Runs one source, records the outcome and never throws: a failing source yields
 * no articles, and the run carries on with the others.
 *
 * @param {{report: RunReport, signal?: AbortSignal}} ctx
 * @param {string} name
 * @param {(note: (message: string) => void) => Promise<object[]>} fn
 *   receives `note`, for warnings that do not make the source a failure ("3 of
 *   21 queries failed") but should still be visible on the run record
 * @returns {Promise<object[]>}
 */
export async function trackSource(ctx, name, fn) {
  const started = Date.now()
  const notes = []
  try {
    const items = await fn((message) => notes.push(message))
    if (ctx.signal?.aborted) notes.push('time budget reached; partial results')
    ctx.report.addSource({
      name,
      ok: true,
      count: items.length,
      ms: Date.now() - started,
      error: notes.length ? notes.join('; ') : undefined,
    })
    return items
  } catch (error) {
    ctx.report.addSource({ name, ok: false, ms: Date.now() - started, error: error?.message || error })
    return []
  }
}
