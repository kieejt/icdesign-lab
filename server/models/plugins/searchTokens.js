/**
 * Index-backed text search for short fields (names, titles, subjects).
 *
 * The routes used to search with `new RegExp(term, 'i')`. An unanchored,
 * case-insensitive regex cannot use any index, so every search scanned the whole
 * collection, and it also could not match Vietnamese text typed without accents.
 *
 * Instead each document carries `searchTokens`: its searchable fields lower-cased,
 * stripped of diacritics and split into words. A query is split the same way and
 * every word must be the *start* of some token. Anchored, case-sensitive regexes
 * over a multikey index are index-friendly, and "nguyen" finds "Nguyễn".
 *
 * Trade-off: matching is by word prefix, not by arbitrary substring.
 */

/** Lower-case, drop accents (đ included) and split into alphanumeric words. */
export function tokenize(...values) {
  return [
    ...new Set(
      values
        .filter((value) => typeof value === 'string')
        .join(' ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    ),
  ]
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Mongo filter matching documents where every query word prefixes a token. */
export function searchFilter(term) {
  const words = tokenize(String(term ?? '')).slice(0, 8)
  if (words.length === 0) return null
  return { searchTokens: { $all: words.map((word) => new RegExp(`^${escapeRegex(word)}`)) } }
}

/**
 * @param {import('mongoose').Schema} schema
 * @param {{fields: string[]}} options  fields that feed the token list
 */
export default function searchTokensPlugin(schema, { fields }) {
  schema.add({ searchTokens: { type: [String], select: false, index: true } })

  const compute = (source) => tokenize(...fields.map((field) => source[field]))

  schema.pre('validate', function setTokens() {
    this.searchTokens = compute(this)
  })

  schema.pre('insertMany', function setManyTokens(next, docs) {
    for (const doc of docs) doc.searchTokens = compute(doc)
    next()
  })

  // findByIdAndUpdate bypasses document middleware, so recompute from the
  // merged (stored + incoming) values whenever a source field changes.
  schema.pre('findOneAndUpdate', async function refreshTokens() {
    const update = this.getUpdate() ?? {}
    const incoming = { ...update, ...(update.$set ?? {}) }
    if (!fields.some((field) => field in incoming)) return

    const current = (await this.model.findOne(this.getFilter()).lean()) ?? {}
    const merged = { ...current, ...incoming }
    this.setUpdate({ ...update, $set: { ...(update.$set ?? {}), searchTokens: compute(merged) } })
  })

  /** Fills `searchTokens` for documents written before this plugin existed. */
  schema.statics.backfillSearchTokens = async function backfillSearchTokens() {
    const stale = await this.find({ searchTokens: { $exists: false } })
      .select(fields.join(' '))
      .lean()
    if (stale.length === 0) return 0

    await this.bulkWrite(
      stale.map((doc) => ({
        updateOne: { filter: { _id: doc._id }, update: { $set: { searchTokens: compute(doc) } } },
      })),
    )
    return stale.length
  }
}
