import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

/**
 * Redirects the old `/page/:page` news URLs to the query-string form.
 *
 * The news feeds paginated through a path segment before every list on the site
 * moved to `?page=`. Those URLs were public and may have been shared or indexed,
 * so they keep working — permanently, via `replace`, so the dead form never
 * lands in anyone's history.
 *
 * @param {object} props
 * @param {string} props.to  the feed's base path, e.g. `/news/world-news`
 */
export default function LegacyPageRedirect({ to }) {
  const { page } = useParams()

  const parsed = Number(page)
  const target = Number.isFinite(parsed) && parsed > 1 ? `${to}?page=${Math.trunc(parsed)}` : to

  return <Navigate to={target} replace />
}
