/**
 * Bot-protection pages come back with status 200, so a status check alone treats
 * "Access denied" as a normal empty page. Recognise the common ones by title.
 */
export function isBlockedPage(html) {
  const title = String(html).match(/<title>([^<]*)/i)?.[1] ?? ''
  return /access denied|attention required|just a moment|are you a robot|forbidden/i.test(title)
}
