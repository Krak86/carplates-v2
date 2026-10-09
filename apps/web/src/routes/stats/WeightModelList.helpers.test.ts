import { describe, it, expect } from 'vitest'

import { formatWeight } from '@/routes/stats/WeightModelList.helpers'

const kg = new Intl.NumberFormat('en')
const t = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

describe('formatWeight', () => {
  it('shows plain kilograms under 1000', () => {
    expect(formatWeight(761.4, kg, t, 'kg', 't')).toBe('761 kg')
  })

  it('adds tonnes in brackets from 1000 kg', () => {
    expect(formatWeight(2601, kg, t, 'kg', 't')).toBe('2,601 kg (2.6 t)')
    expect(formatWeight(34644.25, kg, t, 'kg', 't')).toBe('34,644 kg (34.6 t)')
  })
})
