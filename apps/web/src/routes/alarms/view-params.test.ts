import { describe, expect, it } from 'vitest'

import { parseChoice, parseRegionParam } from '@/routes/alarms/view-params'

describe('parseChoice', () => {
  const values = ['a', 'b'] as const
  it('accepts listed values and falls back otherwise', () => {
    expect(parseChoice('b', values, 'a')).toBe('b')
    expect(parseChoice('zzz', values, 'a')).toBe('a')
    expect(parseChoice(null, values, 'a')).toBe('a')
  })
})

describe('parseRegionParam', () => {
  it('accepts a plate-region name and rejects anything else', () => {
    expect(parseRegionParam('Київ')).toBe('Київ')
    expect(parseRegionParam('<script>')).toBeNull()
    expect(parseRegionParam(null)).toBeNull()
  })
})
