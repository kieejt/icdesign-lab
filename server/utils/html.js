import { decodeHTML } from 'entities'

/**
 * Plain text from feed/HTML text: entities decoded, tags removed, whitespace
 * collapsed.
 *
 * Some feeds (Thanh Niên, for one) deliver titles with HTML entities still in
 * them ("t&igrave;m nguồn" for "tìm nguồn"); rss-parser passes them through, so
 * they reached the review queue as written.
 *
 * @param {string} [value]
 */
export function cleanText(value = '') {
  return decodeHTML(String(value ?? ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
