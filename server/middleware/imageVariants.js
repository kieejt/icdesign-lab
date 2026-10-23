import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

/**
 * Serves resized WebP copies of uploaded images on demand.
 *
 * `/uploads/img-123.webp?w=480` returns a 480px-wide WebP, generated once and
 * kept in `uploads/_w/`. Doing it lazily means every image already uploaded is
 * covered without a migration, and a width nobody asks for is never produced.
 *
 * Widths are a fixed whitelist: an open `?w=` would let anyone fill the disk
 * with one variant per integer.
 */
export const VARIANT_WIDTHS = [320, 480, 768, 1024, 1600]

const SOURCE_EXT = /\.(?:jpe?g|png|webp)$/i
const SAFE_NAME = /^[\w.-]+$/

/** Concurrent requests for the same variant share one encode. */
const encoding = new Map()

async function buildVariant(source, target, width) {
  await fs.promises.mkdir(path.dirname(target), { recursive: true })

  // Write to a temp name and rename: a reader never sees a half-written file.
  const temp = `${target}.${process.pid}.tmp`
  await sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(temp)
  await fs.promises.rename(temp, target)
}

export default function imageVariants(uploadDir) {
  const variantDir = path.join(uploadDir, '_w')

  return async (req, res, next) => {
    if (req.method !== 'GET' || req.query.w === undefined) return next()

    const width = Number(req.query.w)
    const name = decodeURIComponent(req.path).replace(/^\//, '')

    // Anything unexpected falls through to the plain static handler, which
    // serves the original — a bad query string never breaks an image.
    if (!VARIANT_WIDTHS.includes(width) || !SAFE_NAME.test(name) || !SOURCE_EXT.test(name)) {
      return next()
    }

    const source = path.join(uploadDir, name)
    const target = path.join(variantDir, `${path.parse(name).name}-${width}.webp`)

    try {
      if (!fs.existsSync(target)) {
        if (!fs.existsSync(source)) return next()

        const key = target
        if (!encoding.has(key)) {
          encoding.set(key, buildVariant(source, target, width).finally(() => encoding.delete(key)))
        }
        await encoding.get(key)
      }

      res.set('Cache-Control', 'public, max-age=31536000, immutable')
      res.type('image/webp')
      return res.sendFile(target)
    } catch (error) {
      console.error('Image variant failed:', error.message)
      return next()
    }
  }
}
