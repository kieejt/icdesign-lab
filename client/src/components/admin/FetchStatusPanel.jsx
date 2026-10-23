import React from 'react'

import { Badge, Spinner } from '../ui'
import { AdminCard, InlineNotice } from './index'

const STATUS_TONE = { ok: 'ok', partial: 'warn', failed: 'danger', running: 'neutral' }
const STATUS_LABEL = { ok: 'Healthy', partial: 'Some sources failed', failed: 'Failed', running: 'Running' }

const CATEGORIES = [
  ['World News', 'World'],
  ['Vietnam News', 'Vietnam'],
  ['Jobs', 'Jobs'],
]

function duration(run) {
  if (!run?.finishedAt) return null
  const seconds = Math.max(0, Math.round((new Date(run.finishedAt) - new Date(run.startedAt)) / 1000))
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`
}

/** One line per source, problems first, so a dead source is the first thing seen. */
function SourceList({ sources }) {
  const rank = (s) => (!s.ok ? 0 : s.count === 0 ? 1 : s.error ? 2 : 3)
  const sorted = [...sources].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))

  return (
    <ul className="divide-hairline mt-3 border border-paper-border text-sm">
      {sorted.map((source) => (
        <li key={source.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2.5">
            <Badge tone={!source.ok ? 'danger' : source.count === 0 ? 'warn' : source.error ? 'warn' : 'ok'}>
              {!source.ok ? 'Failed' : source.count === 0 ? 'Empty' : source.error ? 'Partial' : 'OK'}
            </Badge>
            <span className="truncate text-ink-800">{source.name}</span>
          </span>
          <span className="font-mono text-[12.5px] text-ink-400">
            {source.ok ? `${source.count} items` : 'no items'} · {(source.ms / 1000).toFixed(1)} s
          </span>
          {source.error && <span className="basis-full text-xs text-signal-warn">{source.error}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * What the news agent did on its last run, and whether it is running now.
 *
 * Until this panel existed a run left nothing visible: a source that had stopped
 * working, or an AI step that failed on every call, only showed as fewer articles.
 *
 * @param {object} props
 * @param {{running: boolean, current: object|null, last: object|null}|undefined} props.status
 */
export default function FetchStatusPanel({ status }) {
  const running = Boolean(status?.running)
  const run = running ? status?.current : status?.last

  if (!run && !running) {
    return (
      <AdminCard>
        <p className="eyebrow">Last fetch</p>
        <p className="mt-2 text-sm text-ink-500">The agent has not run yet. Use “Fetch Sources Now”, or wait for the scheduled time.</p>
      </AdminCard>
    )
  }

  const sources = run?.sources ?? []
  const problems = sources.filter((s) => !s.ok || s.count === 0 || s.error).length
  const aiFailed = (run?.ai?.failed ?? 0) > 0 && (run?.ai?.used ?? 0) === 0

  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">{running ? 'Fetching now' : 'Last fetch'}</p>
          <Badge tone={STATUS_TONE[running ? 'running' : run.status]}>{STATUS_LABEL[running ? 'running' : run.status]}</Badge>
          {running && <Spinner className="h-4 w-4" />}
        </div>
        {run && (
          <p className="font-mono text-[12.5px] text-ink-400">
            {new Date(run.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            {duration(run) && ` · ${duration(run)}`}
            {run.trigger && ` · ${run.trigger}`}
          </p>
        )}
      </div>

      {!running && run && (
        <>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            {CATEGORIES.map(([id, label]) => {
              const stats = run.perCategory?.[id]
              return (
                <div key={id}>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 text-ink-900">
                    <span className="font-display text-xl font-semibold">{stats?.saved ?? 0}</span>
                    <span className="ml-1 text-ink-400">saved</span>
                    {stats?.offTopic > 0 && <span className="ml-2 text-xs text-ink-400">{stats.offTopic} off-topic skipped</span>}
                  </dd>
                </div>
              )
            })}
          </dl>

          {aiFailed && (
            <InlineNotice tone="danger">
              AI ranking was unavailable, so articles were saved with their raw feed snippets and ordered by keyword score only.
              {run.ai?.errors?.[0] && <span className="mt-1 block font-mono text-xs">{run.ai.errors[0]}</span>}
            </InlineNotice>
          )}

          {run.error && <InlineNotice tone="danger">The run stopped with an error: {run.error}</InlineNotice>}
        </>
      )}

      {sources.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-ink-700 hover:text-ink-950">
            {sources.length} sources{problems > 0 ? ` — ${problems} need attention` : ' — all healthy'}
          </summary>
          <SourceList sources={sources} />
        </details>
      )}
    </AdminCard>
  )
}
