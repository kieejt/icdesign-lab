/**
 * Whole-word/phrase keyword match (Unicode-aware) instead of a raw substring `includes()`.
 * Prevents false positives like `'arm'` matching "warm"/"pharma", or `'ai'` matching "hai"/"khai"
 * inside Vietnamese text.
 */
export function hasKeyword(text, keyword) {
  if (!text || !keyword) return false
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu')
  return pattern.test(text)
}
