import { describe, expect, it } from 'vitest'

import { showcaseModels } from './newCarShowcase.js'

describe('showcaseModels', () => {
  it('lists current models for a known brand, tolerating a model suffix on the raw brand', () => {
    expect(showcaseModels('NISSAN')).toContain('Qashqai')
    expect(showcaseModels('HYUNDAI  TUCSON')).toContain('Tucson')
  })

  it('is empty for an unlisted brand or no brand', () => {
    expect(showcaseModels('МУССТАНГ')).toEqual([])
    expect(showcaseModels(null)).toEqual([])
  })
})
