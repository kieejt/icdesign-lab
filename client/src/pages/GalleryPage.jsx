import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Pagination from '../components/Pagination'
import useApiQuery from '../hooks/useApiQuery'
import { responsiveImage } from '../lib/image'
import useListParams from '../hooks/useListParams'
import {
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Section,
  Shell,
  Skeleton,
} from '../components/ui'

/**
 * Album tile.
 *
 * The whole tile used to be a `div` with an `onClick`, which meant no keyboard
 * access, no middle-click, no "open in new tab" and no visible URL on hover.
 * It is a real link now.
 */
function AlbumTile({ album }) {
  return (
    <Link
      to={`/lab-event/gallery/${album._id}`}
      className="group relative block aspect-square overflow-hidden bg-ink-900 md:aspect-[4/5] lg:aspect-square"
    >
      {album.coverImage ? (
        <img
          {...responsiveImage(album.coverImage)}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-90 transition-all duration-[900ms] ease-out group-hover:scale-[1.04] group-hover:opacity-100"
        />
      ) : (
        <div className="hatch flex h-full w-full items-center justify-center text-ink-600">
          <Icon name="image" className="h-12 w-12" strokeWidth={1} />
        </div>
      )}

      {/* Scrim strengthens on hover so the caption stays readable over any photo. */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent p-7 transition-colors duration-500 group-hover:from-ink-950/95">
        <p className="eyebrow text-accent-300">{album.category}</p>
        <h2 className="mt-2 font-display text-xl font-medium leading-tight text-paper">
          {album.title}
        </h2>
        <p className="mt-2 font-mono text-[11px] text-paper/60">
          {album.images?.length || 0} photos
        </p>
      </div>
    </Link>
  )
}

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1 }

export default function GalleryPage() {
  const { t } = useTranslation()
  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values

  const { data, loading, error, refetch } = useApiQuery('/gallery', {
    params: { page, limit: 12 },
    staleTime: 5 * 60_000,
  })

  const albums = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <PageHeader
        eyebrow={t('ui.eyebrowArchive')}
        title={t('media.galleryTitle')}
        subtitle={t('media.gallerySubtitle')}
      />

      <Section>
        <Shell>
          {loading ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="aspect-square md:aspect-[4/5] lg:aspect-square" />
              ))}
            </div>
          ) : error && albums.length === 0 ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : albums.length === 0 ? (
            <EmptyState
              icon={<Icon name="image" className="h-12 w-12" strokeWidth={1} />}
              title={t('media.noGallery')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-3">
              {albums.map((album) => (
                <AlbumTile key={album._id} album={album} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(next) => hrefFor({ page: next })}
            loading={loading}
            className="mt-16"
          />
        </Shell>
      </Section>
    </>
  )
}
