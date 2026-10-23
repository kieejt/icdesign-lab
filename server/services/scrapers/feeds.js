import Parser from 'rss-parser'

import { get } from './http.js'

const parser = new Parser()

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Fetches and parses one RSS/Atom feed.
 *
 * Goes through axios (retry, abort signal, consistent UA and redirect handling)
 * and hands the text to rss-parser, rather than letting rss-parser fetch by
 * itself: some hosts answer rss-parser's own client with something it cannot
 * read but serve axios fine.
 *
 * @param {string} url
 * @param {{signal?: AbortSignal}} ctx
 */
export async function fetchFeed(url, ctx = {}) {
  const response = await get(
    url,
    {
      responseType: 'text',
      timeout: 15_000,
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    },
    { signal: ctx.signal, retries: 1 },
  )
  return parser.parseString(response.data)
}
