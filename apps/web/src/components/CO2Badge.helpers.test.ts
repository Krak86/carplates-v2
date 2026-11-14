import { describe, expect, it } from 'vitest'

import { humanDaysPer100Km } from './CO2Badge.helpers'

describe('humanDaysPer100Km', () => {
  it('scales g/km to person-days of exhaled CO2 per 100 km', () => {
    expect(humanDaysPer100Km(100)).toBe(10)
    expect(humanDaysPer100Km(0)).toBe(0)
  })
})
