/*
 * Responsive sources for uploaded images.
 *
 * The server resizes `/uploads/<file>?w=<width>` on demand and answers with a
 * cached WebP, so a phone asking for a 480px card image no longer downloads the
 * 2000px original. Anything that isn't one of our own uploads (external URLs,
 * GIFs, SVGs) is returned untouched.
 */

/** Must be a subset of VARIANT_WIDTHS in server/middleware/imageVariants.js. */
const WIDTHS = [320, 480, 768, 1024, 1600]

const RESIZABLE = /^\/uploads\/[\w.-]+\.(?:jpe?g|png|webp)$/i

/**
 * @param {string} [src]
 * @returns {{src?: string, srcSet?: string}} props to spread onto an <img>
 */
export function responsiveImage(src) {
  if (!src || !RESIZABLE.test(src)) return { src }

  // `src` keeps a mid-size fallback for browsers that ignore srcset.
  return {
    src: `${src}?w=1024`,
    srcSet: WIDTHS.map((width) => `${src}?w=${width} ${width}w`).join(', '),
  }
}

/** Default `sizes`: one column on phones, two on tablets, a third on desktop. */
export const CARD_SIZES = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
