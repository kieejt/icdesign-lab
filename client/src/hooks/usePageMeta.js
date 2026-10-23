import { useEffect } from 'react'

const SITE_NAME = 'IC Design Lab'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const absolute = (url) => (url ? new URL(url, window.location.origin).href : undefined)

/**
 * Sets the document title, description, canonical URL and social tags for the
 * current page, plus optional JSON-LD structured data.
 *
 * The site is a single-page app, so every route used to share the title and
 * description from index.html — search results and browser tabs all read
 * "IC Design Lab", and Scholar-style crawlers could not tell a publication from
 * the homepage. Pass `undefined` while data is loading; the previous values are
 * kept until real ones arrive.
 *
 * @param {object} meta
 * @param {string} [meta.title]        page title (site name is appended)
 * @param {string} [meta.description]
 * @param {string} [meta.image]        path or URL of a share image
 * @param {object} [meta.jsonLd]       schema.org object, serialised into <script>
 */
export default function usePageMeta({ title, description, image, jsonLd } = {}) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    if (!title) return undefined

    const previousTitle = document.title
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
    document.title = fullTitle
    setMeta('property', 'og:title', fullTitle)
    setMeta('name', 'twitter:title', fullTitle)

    const canonical = `${window.location.origin}${window.location.pathname}`
    setCanonical(canonical)
    setMeta('property', 'og:url', canonical)

    if (description) {
      const clipped = description.replace(/\s+/g, ' ').trim().slice(0, 300)
      setMeta('name', 'description', clipped)
      setMeta('property', 'og:description', clipped)
    }
    if (image) setMeta('property', 'og:image', absolute(image))

    return () => {
      document.title = previousTitle
    }
  }, [title, description, image])

  useEffect(() => {
    if (!jsonLdText) return undefined

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = jsonLdText
    document.head.appendChild(script)
    return () => script.remove()
  }, [jsonLdText])
}
