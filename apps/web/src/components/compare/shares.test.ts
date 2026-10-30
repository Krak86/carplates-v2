import { describe, expect, it } from 'vitest'

import type { RdwMatchInfo } from '@carplates/shared'

import { buildShareBars } from './shares'
import type { CompareLoaded } from './types'

const loaded = (specs: Record<string, unknown> | null): CompareLoaded =>
  ({ car: null, rdw: specs ? ({ specs } as unknown as RdwMatchInfo) : null }) as CompareLoaded

describe('buildShareBars', () => {
  it('keeps the largest classes and folds the rest into other', () => {
    const a = loaded({
      fuelMix: [
        { key: 'benzine', share: 0.6 },
        { key: 'diesel', share: 0.3 }
      ]
    })
    const [bar] = buildShareBars(a, loaded(null))
    expect(bar?.key).toBe('fuelMix')
    expect(bar?.sides[0]?.items.map(i => i.key)).toEqual(['benzine', 'diesel'])
    expect(bar?.sides[0]?.other).toBeCloseTo(0.1)
    expect(bar?.sides[1]).toBeNull()
  })

  it('drops noise classes and measures neither car has', () => {
    const a = loaded({ fuelMix: [{ key: 'lpg', share: 0.01 }] })
    expect(buildShareBars(a, loaded({}))).toEqual([])
  })

  it('has no other slice when the classes already fill the bar', () => {
    const a = loaded({ colours: [{ key: 'GRIJS', share: 0.99 }] })
    expect(buildShareBars(a, a)[0]?.sides[0]?.other).toBe(0)
  })
})
