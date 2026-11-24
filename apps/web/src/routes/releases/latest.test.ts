import { describe, expect, it } from 'vitest'
import { RELEASES } from '@carplates/shared/releases'

import { LATEST_RELEASE_DATE } from '@/routes/releases/latest'

const versionNumber = (v: string): number => Number(v.replace(/^v2\./, ''))

describe('LATEST_RELEASE_DATE', () => {
  it('matches the newest day in RELEASES', () => {
    const newest = RELEASES.map(d => d.date)
      .sort()
      .at(-1)
    expect(LATEST_RELEASE_DATE).toBe(newest)
  })

  it('is the first entry of the log (newest day first)', () => {
    expect(RELEASES[0]?.date).toBe(LATEST_RELEASE_DATE)
  })
})

describe('RELEASES order', () => {
  it('lists days strictly newest first, with no duplicate date', () => {
    RELEASES.slice(1).forEach((day, i) => {
      const newer = RELEASES[i]!
      expect(newer.date > day.date, `${newer.date} must be after ${day.date}`).toBe(true)
    })
  })

  it('never has a version lower than an earlier day (compared with the previous entry)', () => {
    RELEASES.slice(1).forEach((older, i) => {
      const newer = RELEASES[i]!
      if (!newer.version || !older.version) return
      expect(
        versionNumber(newer.version) >= versionNumber(older.version),
        `${newer.date} ${newer.version} < ${older.date} ${older.version}`
      ).toBe(true)
    })
  })

  it('has no day dated in the future', () => {
    const today = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
    expect(RELEASES.every(d => d.date <= today)).toBe(true)
  })
})
