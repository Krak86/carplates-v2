import { describe, expect, it } from 'vitest'
import { RELEASES } from '@carplates/shared/releases'

import { LATEST_RELEASE_DATE } from '@/routes/releases/latest'

describe('LATEST_RELEASE_DATE', () => {
  it('matches the newest day in RELEASES', () => {
    const newest = RELEASES.map(d => d.date)
      .sort()
      .at(-1)
    expect(LATEST_RELEASE_DATE).toBe(newest)
  })
})
