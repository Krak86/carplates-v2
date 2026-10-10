import { describe, it, expect } from 'vitest'

import { operStatus } from '@/lib/oper-info'

describe('operStatus', () => {
  it('flags the serviceman temporary state registration', () => {
    expect(operStatus(215)).toBe('military')
  })

  it('groups the other temporary / proper-user codes', () => {
    expect(operStatus(210)).toBe('temporary')
    expect(operStatus(294)).toBe('temporary')
    expect(operStatus(254)).toBe('properUser')
  })

  it('reuses the timeline categories for the rest', () => {
    expect(operStatus(30)).toBe('new')
    expect(operStatus(71)).toBe('import')
    expect(operStatus(315)).toBe('owner')
    expect(operStatus(400)).toBe('modification')
    expect(operStatus(530)).toBe('deregistered')
    expect(operStatus(410)).toBe('other')
    expect(operStatus(null)).toBe('other')
  })
})
