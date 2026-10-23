import assert from 'node:assert/strict'
import { test } from 'node:test'

import { effectiveStatus, parseDay, statusFilter, todayInVietnam } from '../utils/eventDates.js'

test('parseDay accepts real calendar days only', () => {
  assert.equal(parseDay('2026-07-14').toISOString(), '2026-07-14T00:00:00.000Z')
  for (const bad of ['2026-02-30', '2026-13-01', '14/07/2026', '2026-7-1', '', null, 20260714, '1800-01-01']) {
    assert.equal(parseDay(bad), null, String(bad))
  }
})

test('"today" is the date in Vietnam (UTC+7)', () => {
  // 18:00 UTC on 13 July is already 14 July at 01:00 in Hanoi.
  assert.equal(todayInVietnam(Date.parse('2026-07-13T18:00:00Z')).toISOString(), '2026-07-14T00:00:00.000Z')
  assert.equal(todayInVietnam(Date.parse('2026-07-13T16:59:00Z')).toISOString(), '2026-07-13T00:00:00.000Z')
})

test('an event stays upcoming through its last day, then becomes past', () => {
  const today = parseDay('2026-07-14')
  assert.equal(effectiveStatus({ eventDate: parseDay('2026-07-14'), status: 'Past' }, today), 'Upcoming')
  assert.equal(effectiveStatus({ eventDate: parseDay('2026-07-13'), status: 'Upcoming' }, today), 'Past')
  assert.equal(effectiveStatus({ eventDate: parseDay('2026-07-12'), endDate: parseDay('2026-07-15'), status: 'Past' }, today), 'Upcoming')
})

test('events without a date keep the stored status', () => {
  assert.equal(effectiveStatus({ status: 'Past' }), 'Past')
  assert.equal(effectiveStatus({ status: 'Upcoming' }), 'Upcoming')
})

test('statusFilter has a clause per kind of event, and none for "all"', () => {
  assert.deepEqual(statusFilter(undefined), {})
  assert.equal(statusFilter('Upcoming').$or.length, 2)
  assert.equal(statusFilter('Past').$or.length, 2)
})
