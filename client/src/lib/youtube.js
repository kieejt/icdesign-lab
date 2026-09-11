/*
 * YouTube URL helpers.
 *
 * The lecture list and the lecture detail page each had their own copy of this
 * regex, and they disagreed — one accepted `youtu.be` short links, the other did
 * not. One implementation, one behaviour.
 */

// Matches the id in watch?v=, youtu.be/, /embed/, /v/, /shorts/ and /live/ forms.
const ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

/**
 * Extracts the 11-character video id from any common YouTube URL.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function youtubeId(url) {
  if (!url || typeof url !== 'string') return null
  return url.match(ID_PATTERN)?.[1] ?? null
}

/**
 * Privacy-enhanced embed URL (`youtube-nocookie.com`), which does not set
 * tracking cookies until the visitor actually plays the video.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function youtubeEmbedUrl(url) {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null
}

/**
 * Thumbnail for a video.
 *
 * @param {string} url
 * @param {'hq'|'mq'|'max'} [quality]
 * @returns {string}
 */
export function youtubeThumbnail(url, quality = 'hq') {
  const id = youtubeId(url)
  if (!id) return ''
  const file = { hq: 'hqdefault', mq: 'mqdefault', max: 'maxresdefault' }[quality] || 'hqdefault'
  return `https://img.youtube.com/vi/${id}/${file}.jpg`
}

export default { youtubeId, youtubeEmbedUrl, youtubeThumbnail }
