import { describe, expect, it } from 'vitest'

import { RELEASES } from './releases.js'
import { RELEASE_MONTHS } from './releases/core.js'

describe('release months', () => {
  it('RELEASE_MONTHS lists every month of RELEASES, newest first', () => {
    const months = [...new Set(RELEASES.map(d => d.date.slice(0, 7)))].sort().reverse()
    expect([...RELEASE_MONTHS]).toEqual(months)
  })

  it('keeps the barrel newest-first', () => {
    const dates = RELEASES.map(d => d.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
})
