import React from 'react'

/**
 * Catches render-time errors so one broken component shows a recoverable panel
 * instead of unmounting the whole app into a blank white page.
 *
 * Also handles the stale-chunk case: after a deploy, a lazily-imported route
 * that was code-split into a now-replaced file fails to load. A reload fetches
 * the new manifest, so that specific failure self-heals.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state

    if (!error) return this.props.children

    const isChunkError = /dynamically imported module|Loading chunk|Importing a module script/i.test(
      error.message || '',
    )

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg border border-paper-border bg-paper-raised p-10 text-center">
          <p className="eyebrow text-signal-danger">
            {isChunkError ? 'Update available' : 'Unexpected error'}
          </p>
          <h1 className="mt-4 font-display text-2xl font-medium text-ink-950">
            {isChunkError ? 'This page needs a refresh' : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">
            {isChunkError
              ? 'A newer version of the site was published while this tab was open. Reload to pick it up.'
              : 'The page could not be displayed. Reloading usually resolves it.'}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Reload page
            </button>
            <a href="/" className="btn-secondary">
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
