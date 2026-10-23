/**
 * Fails when a component reaches outside the design system.
 *
 * The admin console drifted into its own palette, corner radii and button styles
 * because nothing stopped it. This keeps the system honest: colours come from the
 * `ink / paper / accent / signal` scales in tailwind.config.js, corners are square,
 * and decoration shadows are reserved for overlays.
 *
 *   node scripts/check-design-tokens.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const PALETTES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const RULES = [
  {
    name: 'default Tailwind palette',
    pattern: new RegExp(`\\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration)-(?:${PALETTES})-\\d{2,3}\\b`),
    hint: 'use ink / paper / accent / signal tokens',
  },
  {
    name: 'raw hex colour in a class',
    pattern: /\b(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/,
    hint: 'add a token to tailwind.config.js instead',
  },
  {
    name: 'rounded corners',
    pattern: /\brounded(?:-(?:sm|md|lg|xl|2xl|3xl|full|t|b|l|r)[\w-]*)?\b(?!-none)/,
    hint: 'the system is square-cornered (rounded-full allowed only for spinners/dots, listed below)',
    allow: [/rounded-full/],
  },
  {
    name: 'decorative shadow',
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
    hint: 'use shadow-raise / shadow-lift / shadow-overlay',
  },
]

/** Files where a rule legitimately does not apply. */
const EXEMPT = {
  'rounded corners': ['components/ui/index.jsx', 'components/Chatbot.jsx'],
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(jsx|js)$/.test(entry)) yield path
  }
}

const problems = []

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll('\\', '/')
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, index) => {
    if (!/class(?:Name)?=|cx\(|`/.test(line)) return

    for (const rule of RULES) {
      if (EXEMPT[rule.name]?.includes(rel)) continue
      const match = line.match(rule.pattern)
      if (!match) continue
      if (rule.allow?.some((allowed) => allowed.test(match[0]))) continue
      problems.push(`${rel}:${index + 1}  ${rule.name} — "${match[0]}" (${rule.hint})`)
    }
  })
}

if (problems.length) {
  console.error(`Design-token check found ${problems.length} problem(s):\n`)
  console.error(problems.join('\n'))
  process.exit(1)
}

console.log('Design-token check passed.')
