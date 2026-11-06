import { describe, expect, it } from 'vitest'

import { composeComparePreview } from './compare-preview.js'

const audi = { car: 'Audi Q5', year: '2023', id: 'BE6756HE' }
const kia = { car: "Kia Cee'd", year: '2012', id: 'BC6743PH' }

describe('composeComparePreview', () => {
  it('names both cars and their Latin plates in a short title', () => {
    const p = composeComparePreview('en', audi, kia)
    expect(p.title).toBe("Audi Q5 BE6756HE vs Kia Cee'd BC6743PH | Cars UA")
    expect(p.description).toContain('Audi Q5 BE6756HE 2023')
    expect(p.description).toContain("Kia Cee'd BC6743PH 2012")
  })

  it('keeps the card headline to the two names and puts plates and years in the small line', () => {
    const p = composeComparePreview('ua', audi, kia)
    expect(p.card.title).toBe("Audi Q5 vs Kia Cee'd")
    expect(p.card.description).toBe('Порівняння авто: BE6756HE 2023 / BC6743PH 2012')
  })

  it('falls back to the plate when the car is unknown, and handles a typical model (no id)', () => {
    const p = composeComparePreview(
      'en',
      { car: '', year: null, id: 'AA1234BB' },
      { car: 'BMW 3 Series', year: '2015', id: null }
    )
    expect(p.title).toBe('AA1234BB vs BMW 3 Series | Cars UA')
    expect(p.card.title).toBe('AA1234BB vs BMW 3 Series')
    expect(p.card.description).toBe('Car comparison: AA1234BB / 2015')
  })
})
