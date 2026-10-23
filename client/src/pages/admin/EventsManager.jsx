import React, { useState } from 'react'

import { AdminCard, AdminSection, EmptyRow, FormField, InlineNotice } from '../../components/admin'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { Badge, ErrorState, Skeleton } from '../../components/ui'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'
import { formatEventDate, guessDay, statusForDays, toInputDay } from '../../lib/eventDate'

const TITLE_MAX = 150
const LOCATION_MAX = 200
const DESCRIPTION_MAX = 5000

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'Past', label: 'Past' },
]

const EMPTY_FORM = { title: '', eventDate: '', endDate: '', location: '', description: '' }

/** Form values for an existing event (or a copy of one). */
function formFrom(event, { copy = false } = {}) {
  return {
    title: copy ? `${event.title} (copy)` : event.title,
    // Dated events carry a real date; older ones only text we can try to read.
    eventDate: copy ? '' : toInputDay(event.eventDate) || guessDay(event.date),
    endDate: copy ? '' : toInputDay(event.endDate),
    location: event.location,
    description: event.description,
  }
}

const sameForm = (a, b) => Object.keys(EMPTY_FORM).every((key) => a[key] === b[key])

/* -------------------------------------------------------------------------- */
/* Form dialog                                                                 */
/* -------------------------------------------------------------------------- */

function EventDialog({ event, initial, onClose, onSaved }) {
  // `event` is the record being edited; absent for a new (or duplicated) one.
  const [form, setForm] = useState(initial)
  const [multiDay, setMultiDay] = useState(Boolean(initial.endDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const dirty = !sameForm(form, initial)
  const status = statusForDays(form.eventDate, multiDay ? form.endDate : '')
  const legacyText = event && !event.eventDate ? event.date : ''

  const requestClose = () => {
    if (dirty && !window.confirm('Discard your changes?')) return
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (multiDay && form.endDate && form.endDate < form.eventDate) {
      setError('The end date cannot be before the start date.')
      return
    }

    setSaving(true)
    try {
      const payload = { ...form, endDate: multiDay ? form.endDate : '' }
      if (event) await api.put(`/lab-events/${event._id}`, payload)
      else await api.post('/lab-events', payload)
      onSaved(event ? `“${form.title}” was updated.` : `“${form.title}” was created.`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the event. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={requestClose}
      title={event ? 'Edit event' : 'New event'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-sm text-ink-500 sm:block">
            {status ? (
              <>
                Will be listed as <Badge tone={status === 'Upcoming' ? 'ok' : 'neutral'}>{status}</Badge>
                {' '}— it switches to Past by itself after the last day.
              </>
            ) : (
              'Pick a date to see how it will be listed.'
            )}
          </p>
          <div className="ml-auto flex gap-3">
            <button type="button" onClick={requestClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="event-form" disabled={saving || (event?.eventDate && !dirty)} className="btn-primary">
              {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </div>
      }
    >
      <form id="event-form" onSubmit={submit} className="space-y-5">
        {error && <InlineNotice>{error}</InlineNotice>}

        <FormField label="Title" htmlFor="event-title" required hint={`${form.title.length}/${TITLE_MAX}`}>
          <input
            id="event-title"
            value={form.title}
            onChange={set('title')}
            className="field"
            placeholder="e.g. Graduation project defence 2026.1"
            maxLength={TITLE_MAX}
            autoFocus
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label={multiDay ? 'Start date' : 'Date'} htmlFor="event-date" required>
            <input id="event-date" type="date" value={form.eventDate} onChange={set('eventDate')} className="field" required />
          </FormField>
          {multiDay ? (
            <FormField label="End date" htmlFor="event-end" required>
              <input
                id="event-end"
                type="date"
                value={form.endDate}
                min={form.eventDate || undefined}
                onChange={set('endDate')}
                className="field"
                required
              />
            </FormField>
          ) : (
            <div className="flex items-end pb-2.5">
              <button
                type="button"
                onClick={() => setMultiDay(true)}
                className="link-quiet text-sm"
              >
                + It lasts more than one day
              </button>
            </div>
          )}
        </div>
        {multiDay && (
          <button
            type="button"
            onClick={() => {
              setMultiDay(false)
              setForm((f) => ({ ...f, endDate: '' }))
            }}
            className="link-quiet -mt-2 text-sm"
          >
            − Single day
          </button>
        )}
        {legacyText && (
          <InlineNotice tone="info">
            This event was saved with the text “{legacyText}”. {form.eventDate ? 'We read it as the date above — check it.' : 'Pick the date; it replaces the text.'}
          </InlineNotice>
        )}

        <FormField label="Location" htmlFor="event-location" required>
          <input
            id="event-location"
            value={form.location}
            onChange={set('location')}
            className="field"
            placeholder="e.g. Room 824, C7 Building, HUST"
            maxLength={LOCATION_MAX}
            required
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="event-description"
          required
          hint={`${form.description.length}/${DESCRIPTION_MAX} — line breaks are kept on the public page.`}
        >
          <textarea
            id="event-description"
            value={form.description}
            onChange={set('description')}
            className="field min-h-40 resize-y"
            placeholder="What happens, who it is for, how to take part."
            maxLength={DESCRIPTION_MAX}
            required
          />
        </FormField>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

/** Day-of-month and month at a glance; falls back to a dash for undated entries. */
function DateBlock({ event }) {
  const date = event.eventDate ? new Date(event.eventDate) : null
  if (!date || Number.isNaN(date.getTime())) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-dashed border-paper-border text-ink-300" title="Old entry: date is free text">
        —
      </div>
    )
  }
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center border border-paper-border bg-paper-sunken leading-none">
      <span className="font-display text-xl font-semibold text-ink-950">{date.getUTCDate()}</span>
      <span className="eyebrow mt-1">{date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
    </div>
  )
}

function EventRow({ event, busy, onEdit, onDuplicate, onDelete }) {
  const upcoming = event.status === 'Upcoming'
  return (
    <li className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
      <DateBlock event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="font-semibold text-ink-950">{event.title}</p>
          <Badge tone={upcoming ? 'warn' : 'neutral'}>{event.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {formatEventDate(event)} &bull; {event.location}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-500">{event.description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={onEdit} disabled={busy} className="btn-secondary btn-sm">
          Edit
        </button>
        <button type="button" onClick={onDuplicate} disabled={busy} className="btn-secondary btn-sm" title="Start a new event from this one">
          Duplicate
        </button>
        <button type="button" onClick={onDelete} disabled={busy} className="btn-danger btn-sm">
          Delete
        </button>
      </div>
    </li>
  )
}

export default function EventsManager() {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null) // { event?, initial }
  const [notice, setNotice] = useState(null) // { tone, text }
  const [busy, setBusy] = useState(false)

  const q = useDebouncedValue(search.trim(), 300)
  const { data, loading, error: loadError, refetch } = useApiQuery('/lab-events', {
    params: { page, limit: 10, status: filter, q },
    staleTime: 0,
  })

  const events = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const filtered = Boolean(filter || q)

  const refresh = () => invalidateQueries('/lab-events')
  const pick = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const handleSaved = (text) => {
    setDialog(null)
    setNotice({ tone: 'ok', text })
    refresh()
  }

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return
    setBusy(true)
    setNotice(null)
    try {
      await api.delete(`/lab-events/${event._id}`)
      setNotice({ tone: 'ok', text: `“${event.title}” was deleted.` })
      // Deleting the last row of a page would otherwise leave an empty page.
      if (events.length === 1 && page > 1) setPage(page - 1)
      refresh()
    } catch (err) {
      setNotice({ tone: 'danger', text: err.response?.data?.message || 'Failed to delete the event.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}

      <AdminSection
        title="Events"
        count={total}
        action={
          <button type="button" onClick={() => setDialog({ initial: EMPTY_FORM })} className="btn-primary">
            New event
          </button>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="event-search" className="sr-only">
              Search events
            </label>
            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(e) => pick(setSearch)(e.target.value)}
              className="field"
              placeholder="Search by title or location"
            />
          </div>
          <div className="flex gap-1 border border-paper-border p-0.5" role="tablist" aria-label="Filter events">
            {FILTERS.map(({ id, label }) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => pick(setFilter)(id)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === id ? 'bg-ink-950 text-paper' : 'text-ink-600 hover:bg-paper-sunken'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadError && !data ? (
          <ErrorState message="Failed to load events" onRetry={refetch} />
        ) : loading && !data ? (
          <AdminCard padded={false} className="divide-hairline" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <Skeleton className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </AdminCard>
        ) : events.length === 0 ? (
          <EmptyRow>{filtered ? 'No event matches this search.' : 'No events yet. Use “New event” to add the first one.'}</EmptyRow>
        ) : (
          <AdminCard padded={false}>
            <ul className="divide-hairline">
              {events.map((event) => (
                <EventRow
                  key={event._id}
                  event={event}
                  busy={busy}
                  onEdit={() => setDialog({ event, initial: formFrom(event) })}
                  onDuplicate={() => setDialog({ initial: formFrom(event, { copy: true }) })}
                  onDelete={() => handleDelete(event)}
                />
              ))}
            </ul>
          </AdminCard>
        )}
        <div className="pt-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
        </div>
      </AdminSection>

      {dialog && (
        <EventDialog
          key={dialog.event?._id ?? `new-${dialog.initial.title}`}
          event={dialog.event}
          initial={dialog.initial}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
