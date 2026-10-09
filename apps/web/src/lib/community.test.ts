import { describe, it, expect } from 'vitest'

import { communitySearchTerm } from './community'

describe('communitySearchTerm', () => {
  it('joins make and model without the year', () => {
    expect(communitySearchTerm('VOLKSWAGEN', 'PASSAT')).toBe('VOLKSWAGEN PASSAT')
  })

  it('falls back to the make alone', () => {
    expect(communitySearchTerm(' Skoda ', null)).toBe('Skoda')
  })
})
