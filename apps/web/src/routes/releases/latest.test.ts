import { describe, expect, it } from 'vitest'

import { LATEST_RELEASE_DATE } from '@/routes/releases/latest'
import { RELEASES } from '@/routes/releases/releases'

describe('LATEST_RELEASE_DATE', () => {
  it('matches the newest day in RELEASES', () => {
    const newest = RELEASES.map(d => d.date)
      .sort()
      .at(-1)
    expect(LATEST_RELEASE_DATE).toBe(newest)
  })
})
