import { describe, expect, it } from 'vitest'
import type { ReleaseDay, ReleaseItem } from '@carplates/shared/releases'

import { buildDigest, isSendWindow, previousPeriod } from './digest-content.js'

const item = (group: ReleaseItem['group'], en: string): ReleaseItem => ({ group, ua: en, ru: en, en })

describe('previousPeriod', () => {
  it('is the month before the current Kyiv month', () => {
    expect(previousPeriod(new Date('2026-11-01T10:00:00Z'))).toEqual({
      period: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31'
    })
  })

  it('wraps over the year and knows short months', () => {
    expect(previousPeriod(new Date('2027-01-02T10:00:00Z')).period).toBe('2026-12')
    expect(previousPeriod(new Date('2028-03-01T10:00:00Z')).to).toBe('2028-02-29')
  })

  it('uses Kyiv midnight, not UTC', () => {
    // 2026-10-31 22:30 UTC is already 2026-11-01 in Kyiv (UTC+2 after the October DST change).
    expect(previousPeriod(new Date('2026-10-31T22:30:00Z')).period).toBe('2026-10')
  })
})

describe('isSendWindow', () => {
  it('opens on the 1st at 09:00 Kyiv and stays open for 3 days', () => {
    expect(isSendWindow(new Date('2026-11-01T06:59:00Z'))).toBe(false) // 08:59 Kyiv
    expect(isSendWindow(new Date('2026-11-01T07:00:00Z'))).toBe(true) // 09:00 Kyiv
    expect(isSendWindow(new Date('2026-11-03T20:00:00Z'))).toBe(true)
    expect(isSendWindow(new Date('2026-11-04T08:00:00Z'))).toBe(false)
    expect(isSendWindow(new Date('2026-11-15T12:00:00Z'))).toBe(false)
  })
})

describe('buildDigest', () => {
  const period = { period: '2026-10', from: '2026-10-01', to: '2026-10-31' }
  const releases: ReleaseDay[] = [
    { date: '2026-09-30', items: [item('new', 'September feature')] },
    { date: '2026-10-01', items: [item('new', 'First'), item('fix', 'Bug')] },
    { date: '2026-10-31', items: [item('new', 'Last'), item('improved', 'Polish'), item('data', 'Rows')] },
    { date: '2026-11-01', items: [item('new', 'November feature')] }
  ]

  it('keeps only the month, newest day first, and counts the rest', () => {
    const digest = buildDigest(releases, period)
    expect(digest?.features.map(f => f.en)).toEqual(['Last', 'First'])
    expect(digest).toMatchObject({ improved: 1, data: 1, fix: 1 })
  })

  it('is null when the month shipped no new feature', () => {
    const quiet: ReleaseDay[] = [{ date: '2026-10-05', items: [item('fix', 'Bug'), item('improved', 'Polish')] }]
    expect(buildDigest(quiet, period)).toBeNull()
    expect(buildDigest([], period)).toBeNull()
  })
})
