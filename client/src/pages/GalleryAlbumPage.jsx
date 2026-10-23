import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import useApiQuery from '../hooks/useApiQuery'
import { responsiveImage } from '../lib/image'
import {
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Section,
  Shell,
  Skeleton,
  cx,
  formatDate,
} from '../components/ui'

/** Turns an album title into a filesystem-safe basename. */
const safeName = (value) => (value || 'album').replace(/[^a-zA-Z0-9_-]+/g, '_')

/** Saves a Blob under `filename` via a temporary object URL. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/* -------------------------------------------------------------------------- */
/* Lightbox                                                                    */
/* -------------------------------------------------------------------------- */

function Lightbox({ images, index, title, onClose, onNavigate, onDownload, albumPath }) {
  // Escape closes, arrows move. Registered once for the whole overlay rather
  // than per image.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') onNavigate(-1)
      else if (event.key === 'ArrowRight') onNavigate(1)
    }
    document.addEventListener('keydown', onKeyDown)

    const scrollLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = scrollLock
    }
  }, [onClose, onNavigate])

  const navButton =
    'absolute top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center border border-paper/20 bg-paper/10 text-paper backdrop-blur-sm transition-colors hover:bg-paper/25 disabled:pointer-events-none disabled:opacity-0'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-[100] flex animate-fade-in flex-col items-center justify-center bg-ink-950/95 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close (Esc)"
        // z-10: the image stage below is a positioned sibling that comes later
        // in the DOM, so without this it paints over the button and swallows
        // the click.
        className="absolute right-4 top-4 z-10 p-2 text-paper/70 transition-colors hover:text-paper sm:right-8 sm:top-8"
      >
        <Icon name="close" className="h-8 w-8" strokeWidth={1.5} />
      </button>

      <div className="relative flex w-full max-w-6xl flex-1 items-center justify-center">
        <img
          {...responsiveImage(images[index])}
          sizes="100vw"
          alt={`${title} — ${index + 1}`}
          className="max-h-[78vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        <button
          type="button"
          aria-label="Previous photo"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(-1)
          }}
          className={cx(navButton, 'left-0 sm:left-4')}
        >
          <Icon name="arrowRight" className="h-5 w-5 rotate-180" strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label="Next photo"
          disabled={index === images.length - 1}
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(1)
          }}
          className={cx(navButton, 'right-0 sm:right-4')}
        >
          <Icon name="arrowRight" className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div
        className="mt-6 flex items-center gap-5 font-mono text-[12.5px] uppercase tracking-label text-paper/60"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="tabular-nums">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={() => onDownload([index])}
          className="text-accent-300 transition-colors hover:text-accent-200"
        >
          Download
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(`${window.location.origin}${albumPath}/photo/${index + 1}`)
              .catch(() => {})
          }}
          className="text-accent-300 transition-colors hover:text-accent-200"
        >
          Copy link
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function GalleryAlbumPage() {
  const { id, photoIndex } = useParams()
  const navigateTo = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { data: album, loading, error, refetch } = useApiQuery(`/gallery/${id}`, {
    staleTime: 5 * 60_000,
  })

  const [selected, setSelected] = useState(() => new Set())
  const [downloading, setDownloading] = useState(false)

  const albumPath = `/lab-event/gallery/${id}`

  /*
   * The open photo lives in the URL, not in component state.
   *
   * That makes a single image linkable and shareable, puts Back where a visitor
   * expects it (closing the lightbox rather than leaving the album), and keeps
   * the view correct when the page is reloaded on a photo.
   *
   * The URL is 1-based because that is what the counter shows; internally it is
   * a 0-based array index.
   */
  const parsedIndex = photoIndex === undefined ? null : Number(photoIndex) - 1

  // Stable identity so `download` and `navigate` aren't rebuilt every render.
  const images = useMemo(() => album?.images ?? [], [album])

  // Out-of-range or non-numeric photo segments fall back to the plain album
  // rather than rendering an empty lightbox.
  const lightboxIndex =
    parsedIndex !== null &&
    Number.isInteger(parsedIndex) &&
    parsedIndex >= 0 &&
    parsedIndex < images.length
      ? parsedIndex
      : null

  const openPhoto = useCallback(
    (index) => navigateTo(`${albumPath}/photo/${index + 1}`),
    [navigateTo, albumPath],
  )

  // `replace` so paging through an album doesn't bury the gallery under dozens
  // of history entries.
  const closePhoto = useCallback(
    () => navigateTo(albumPath, { replace: true }),
    [navigateTo, albumPath],
  )

  const toggleSelect = (index) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  /**
   * Downloads one image directly, or several as a zip.
   *
   * JSZip and file-saver together are ~500 kB. They used to be static imports,
   * which pulled that whole payload into this public page for every visitor —
   * including the ones who only ever look at the photos. Importing them inside
   * the handler means the cost is paid only by someone who actually clicks
   * "download", and only for a multi-image download.
   */
  const download = useCallback(
    async (indices) => {
      if (!album || indices.length === 0) return
      setDownloading(true)

      try {
        const base = safeName(album.title)

        if (indices.length === 1) {
          const index = indices[0]
          const response = await fetch(images[index])
          saveBlob(await response.blob(), `${base}_${index + 1}.jpg`)
        } else {
          const [{ default: JSZip }, { saveAs }] = await Promise.all([
            import('jszip'),
            import('file-saver'),
          ])

          const zip = new JSZip()
          const folder = zip.folder(base)

          // Fetched in parallel; sequential awaits made a 30-photo album take
          // 30 round trips end to end.
          const blobs = await Promise.all(
            indices.map((index) => fetch(images[index]).then((r) => r.blob())),
          )
          blobs.forEach((blob, i) => folder.file(`photo_${indices[i] + 1}.jpg`, blob))

          saveAs(await zip.generateAsync({ type: 'blob' }), `${base}.zip`)
        }
      } catch (err) {
        console.error('Download failed', err)
      } finally {
        setDownloading(false)
        setSelected(new Set())
      }
    },
    [album, images],
  )

  const stepPhoto = useCallback(
    (delta) => {
      if (lightboxIndex === null) return
      const next = lightboxIndex + delta
      if (next < 0 || next >= images.length) return
      navigateTo(`${albumPath}/photo/${next + 1}`, { replace: true })
    },
    [lightboxIndex, images.length, navigateTo, albumPath],
  )

  /* --- Loading / error ------------------------------------------------ */
  if (loading) {
    return (
      <Section>
        <Shell>
          <Skeleton className="mb-4 h-3 w-28" />
          <Skeleton className="mb-10 h-10 w-1/2" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </Shell>
      </Section>
    )
  }

  if (error || !album) {
    return (
      <Section>
        <Shell>
          <div className="mx-auto max-w-md space-y-6 text-center">
            <ErrorState message={t('ui.couldNotLoad')} onRetry={refetch} />
            <Link to="/lab-event/gallery" className="btn-secondary">
              {t('ui.backToGallery')}
            </Link>
          </div>
        </Shell>
      </Section>
    )
  }

  const selectedList = [...selected]

  return (
    <>
      <PageHeader
        eyebrow={album.category}
        title={album.title}
        subtitle={`${formatDate(album.createdAt, 'long', locale)} · ${images.length} photos`}
        actions={
          <Link to="/lab-event/gallery" className="link-quiet">
            <span aria-hidden="true">←</span> {t('ui.backToGallery')}
          </Link>
        }
      />

      <Section>
        <Shell>
          {images.length === 0 ? (
            <EmptyState
              icon={<Icon name="image" className="h-12 w-12" strokeWidth={1} />}
              title={t('ui.noImages')}
            />
          ) : (
            <>
              <div className="mb-8 flex flex-col justify-between gap-4 border-b border-paper-border pb-5 sm:flex-row sm:items-center">
                <p className="text-sm text-ink-500">
                  {t('ui.selectToDownload')}
                </p>

                <div className="flex flex-wrap gap-3">
                  {selectedList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => download(selectedList)}
                      disabled={downloading}
                      className="btn-primary btn-sm"
                    >
                      <Icon name="download" className="h-3.5 w-3.5" strokeWidth={2} />
                      {downloading
                        ? t('ui.preparing')
                        : t('ui.downloadSelected', { count: selectedList.length })}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => download(images.map((_, i) => i))}
                    disabled={downloading}
                    className="btn-secondary btn-sm"
                  >
                    {downloading ? t('ui.preparing') : t('ui.downloadAll', { count: images.length })}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((src, index) => {
                  const isSelected = selected.has(index)
                  return (
                    <div
                      key={`${src}-${index}`}
                      className={cx(
                        'group relative aspect-square overflow-hidden border-2 bg-paper-sunken transition-all',
                        isSelected ? 'border-accent-600' : 'border-transparent',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openPhoto(index)}
                        aria-label={t('ui.openPhoto', { index: index + 1 })}
                        className="h-full w-full cursor-zoom-in"
                      >
                        <img
                          {...responsiveImage(src)}
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          alt={`${album.title} — ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSelect(index)}
                        aria-label={isSelected ? t('ui.deselectPhoto') : t('ui.selectPhoto')}
                        aria-pressed={isSelected}
                        className={cx(
                          'absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center border-2 transition-all',
                          isSelected
                            ? 'border-accent-600 bg-accent-600 text-paper'
                            : 'border-paper/80 bg-ink-950/30 text-transparent opacity-0 hover:bg-ink-950/55 focus-visible:opacity-100 group-hover:opacity-100',
                        )}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Shell>
      </Section>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          title={album.title}
          onClose={closePhoto}
          onNavigate={stepPhoto}
          onDownload={download}
          albumPath={albumPath}
        />
      )}
    </>
  )
}
