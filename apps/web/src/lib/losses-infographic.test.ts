import { LOSS_CATEGORIES } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { infographicFileName, infographicHeight, LOSS_ICONS } from '@/lib/losses-infographic'

describe('losses infographic helpers', () => {
  it('has an icon for every category', () => {
    for (const c of LOSS_CATEGORIES) expect(LOSS_ICONS[c]).toBeTruthy()
  })

  it('grows with the row count', () => {
    expect(infographicHeight(15)).toBeGreaterThan(infographicHeight(1))
  })

  it('names the file after the data date', () => {
    expect(infographicFileName('2026-11-04')).toBe('russian-losses-2026-11-04.png')
  })
})
