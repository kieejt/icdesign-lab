// Minimal, dependency-free BibTeX parser. Handles the common shapes produced by
// Google Scholar / IEEE Xplore / DBLP single-entry exports: brace- and quote-delimited
// field values (including nested braces used to protect capitalization, e.g. {IoT}),
// bare tokens (numbers, month macros), and comments. Not a full BibTeX grammar:
// @string macro expansion and cross-entry references are intentionally unsupported.
//
// IMPORTANT: kept byte-identical with client/src/utils/bibtex.js (no shared package
// boundary between client/server in this repo) -- mirror any change in both files.

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

// Combining diacritical marks, composed onto the following letter via Unicode
// normalization -- covers LaTeX accent commands (\'e, \"o, \c{c}, ...) for any
// Latin letter without needing a per-letter lookup table.
const ACCENT_COMBINING = {
  "'": '́',
  '`': '̀',
  '"': '̈',
  '^': '̂',
  '~': '̃',
  v: '̌',
  c: '̧',
  '=': '̄',
  u: '̆',
  '.': '̇',
  k: '̨',
  r: '̊',
  H: '̋',
}

const LATEX_WORD_MAP = {
  ss: 'ß', ae: 'æ', AE: 'Æ', aa: 'å', AA: 'Å',
  o: 'ø', O: 'Ø', l: 'ł', L: 'Ł', i: 'ı',
}

function decodeLatexAccents(str) {
  if (!str) return str
  let result = str.replace(/\\([`'"^~=.]|[vcukrH])\{?([A-Za-z])\}?/g, (match, cmd, letter) => {
    const mark = ACCENT_COMBINING[cmd]
    if (!mark) return match
    return (letter + mark).normalize('NFC')
  })
  result = result.replace(/\\(ss|ae|AE|aa|AA|O|L|l|o|i)(?![a-zA-Z])/g, (match, cmd) => LATEX_WORD_MAP[cmd] || match)
  return result
}

function decodeHtmlEntities(str) {
  if (!str) return str
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos);/g, "'")
}

function stripOuterBraces(str) {
  const trimmed = str.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    let depth = 0
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++
      else if (trimmed[i] === '}') {
        depth--
        if (depth === 0 && i !== trimmed.length - 1) return trimmed
      }
    }
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function decodeValue(raw) {
  let value = stripOuterBraces(raw)
  value = value.replace(/\s+/g, ' ').trim()
  value = decodeHtmlEntities(value)
  // Strip inner brace-wrapping used to protect capitalization/accents (e.g. "{IoT}", "{\'e}")
  // before decoding accents, so a braced accent command like "{\'e}" reduces to the bare
  // "\'e" form the accent decoder expects. Two passes cover one level of nesting cheaply
  // without a full recursive unwrap.
  value = value.replace(/\{([^{}]*)\}/g, '$1')
  value = value.replace(/\{([^{}]*)\}/g, '$1')
  value = decodeLatexAccents(value)
  return value
}

/**
 * Parses the first `@type{citekey, field = value, ...}` entry found in `raw`.
 * Returns null if no valid entry structure is found.
 */
export function parseBibtexEntry(raw) {
  if (!raw || typeof raw !== 'string') return null

  const cleaned = raw
    .split('\n')
    .filter((line) => !/^\s*%/.test(line))
    .join('\n')

  const headerMatch = cleaned.match(/@(\w+)\s*\{\s*([^,\s]+)\s*,/)
  if (!headerMatch) return null

  const type = headerMatch[1].toLowerCase()
  const citekey = headerMatch[2]

  let i = headerMatch.index + headerMatch[0].length
  let depth = 1
  const fields = {}

  while (i < cleaned.length && depth > 0) {
    while (i < cleaned.length && /[\s,]/.test(cleaned[i])) i++
    if (i >= cleaned.length) break
    if (cleaned[i] === '}') {
      depth--
      i++
      continue
    }

    const nameStart = i
    while (i < cleaned.length && cleaned[i] !== '=' && cleaned[i] !== '}') i++
    if (i >= cleaned.length || cleaned[i] === '}') {
      if (cleaned[i] === '}') {
        depth--
        i++
      }
      continue
    }
    const fieldName = cleaned.slice(nameStart, i).trim().toLowerCase()
    i++ // skip '='
    while (i < cleaned.length && /\s/.test(cleaned[i])) i++

    let value = ''
    if (cleaned[i] === '{') {
      const valStart = i
      let braceDepth = 0
      while (i < cleaned.length) {
        if (cleaned[i] === '{') braceDepth++
        else if (cleaned[i] === '}') {
          braceDepth--
          if (braceDepth === 0) {
            i++
            break
          }
        }
        i++
      }
      value = cleaned.slice(valStart, i)
    } else if (cleaned[i] === '"') {
      i++
      const valStart = i
      let braceDepth = 0
      while (i < cleaned.length) {
        if (cleaned[i] === '{') braceDepth++
        else if (cleaned[i] === '}') braceDepth--
        else if (cleaned[i] === '"' && braceDepth === 0) break
        i++
      }
      value = cleaned.slice(valStart, i)
      i++ // skip closing quote
    } else {
      const valStart = i
      while (i < cleaned.length && cleaned[i] !== ',' && cleaned[i] !== '}') i++
      value = cleaned.slice(valStart, i)
    }

    if (fieldName) {
      fields[fieldName] = decodeValue(value)
    }

    while (i < cleaned.length && /\s/.test(cleaned[i])) i++
    if (cleaned[i] === ',') i++
  }

  const rest = cleaned.slice(i).trim()
  const extraContentIgnored = /@\w+\s*\{/.test(rest)

  return { type, citekey, fields, extraContentIgnored }
}

function formatAuthors(rawAuthor) {
  if (!rawAuthor) return ''
  return rawAuthor
    .split(/\s+and\s+/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      if (name.includes(',')) {
        const [last, first] = name.split(',').map((s) => s.trim())
        return first ? `${first} ${last}` : last
      }
      return name
    })
    .join(', ')
}

function parseMonth(monthRaw) {
  if (!monthRaw) return null
  const cleaned = monthRaw.trim().toLowerCase()
  if (MONTH_MAP[cleaned] !== undefined) return MONTH_MAP[cleaned]
  const asNumber = parseInt(cleaned, 10)
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= 12) return asNumber - 1
  return null
}

/**
 * Derives the Research-model citation fields from a raw BibTeX string.
 * Returns null when no `title` field can be extracted -- callers must treat
 * that as a hard validation failure, not a partial success.
 */
export function bibtexToResearchFields(raw, manualLink) {
  const parsed = parseBibtexEntry(raw)
  if (!parsed) return null

  const { fields, extraContentIgnored } = parsed
  const title = fields.title
  if (!title) return null

  const authors = formatAuthors(fields.author)
  const journal = fields.journal || fields.booktitle || fields.publisher || fields.organization || ''

  const year = parseInt(fields.year, 10)
  const validYear = !Number.isNaN(year) ? year : new Date().getFullYear()
  const monthIndex = parseMonth(fields.month)
  // Month absent/unparseable: default to July (index 6) as an "unknown month" sentinel,
  // rather than January, to avoid misreading the placeholder as an actual Jan. publish date.
  const date = new Date(validYear, monthIndex !== null ? monthIndex : 6, 1)

  const description = fields.abstract || ''

  let link = (manualLink || '').trim()
  if (!link) {
    if (fields.url) link = fields.url
    else if (fields.doi) link = `https://doi.org/${fields.doi}`
  }

  return { title, authors, journal, date, description, link, extraContentIgnored: !!extraContentIgnored }
}
