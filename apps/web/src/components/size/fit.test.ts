import { describe, expect, it } from 'vitest'

import {
  GARAGE_REFS,
  PARKING_REFS,
  fitInBay,
  fitInGarage,
  roadChecks,
  sizeTips,
  verdictFromSlack,
  worstVerdict,
  type Dims
} from '@/components/size/fit'

const FIAT_500: Dims = { lengthMm: 3571, widthMm: 1627, heightMm: 1488 }
const GOLF: Dims = { lengthMm: 4284, widthMm: 1789, heightMm: 1456 }
const CAMRY: Dims = { lengthMm: 4885, widthMm: 1840, heightMm: 1445 }
const X5: Dims = { lengthMm: 4922, widthMm: 2004, heightMm: 1745 }
const TRANSIT: Dims = { lengthMm: 5531, widthMm: 2059, heightMm: 2000 }

const bay = (id: string) => {
  const ref = PARKING_REFS.find(r => r.id === id)
  if (!ref) throw new Error(id)
  return ref
}
const garage = (id: string) => {
  const ref = GARAGE_REFS.find(r => r.id === id)
  if (!ref) throw new Error(id)
  return ref
}

describe('verdicts', () => {
  it('uses the edges inclusively and keeps the worst', () => {
    expect(verdictFromSlack(400, 400, 100)).toBe('comfortable')
    expect(verdictFromSlack(399, 400, 100)).toBe('tight')
    expect(verdictFromSlack(99, 400, 100)).toBe('no')
    expect(worstVerdict(['comfortable', 'no', 'tight'])).toBe('no')
  })
})

describe('fitInBay', () => {
  it('fits a Golf comfortably in the Ukrainian 2.5 x 5.3 m place', () => {
    const ua = bay('ua')
    expect(fitInBay(GOLF, ua.widthMm, ua.lengthMm).verdict).toBe('comfortable')
  })

  it('is tighter in the 2.3 m German minimum', () => {
    const de = bay('de')
    expect(fitInBay(GOLF, de.widthMm, de.lengthMm).verdict).toBe('tight')
  })

  it('squeezes a wide SUV and rejects a van', () => {
    const ua = bay('ua')
    expect(fitInBay(X5, ua.widthMm, ua.lengthMm).verdict).toBe('tight')
    expect(fitInBay(TRANSIT, ua.widthMm, ua.lengthMm).verdict).toBe('no')
  })

  it('reports the free millimetres per side', () => {
    expect(fitInBay(GOLF, 2500, 5300).sideMm).toBe(255.5)
  })
})

describe('fitInGarage', () => {
  it('puts a Fiat 500 and a Golf in the single box and two of either in the double', () => {
    expect(fitInGarage(FIAT_500, garage('single')).verdict).toBe('comfortable')
    expect(fitInGarage(GOLF, garage('single')).verdict).toBe('comfortable')
    expect(fitInGarage(GOLF, garage('double')).verdict).toBe('comfortable')
  })

  it('has the Camry fit the box but not by much at the door', () => {
    const fit = fitInGarage(CAMRY, garage('single'))
    expect(fit.parts.width).toBe('comfortable')
    expect(fit.doorMm).toBe(2400 - (1840 + 200))
  })

  it('has a Transit barely clear the door and a taller van not at all', () => {
    const fit = fitInGarage(TRANSIT, garage('single'))
    expect(fit.parts.height).toBe('tight')
    expect(fit.verdict).toBe('tight')
    const tall = fitInGarage({ ...TRANSIT, heightMm: 2400 }, garage('single'))
    expect(tall.parts.height).toBe('no')
    expect(tall.verdict).toBe('no')
  })

  it('squeezes two X5 in the double garage', () => {
    expect(fitInGarage(X5, garage('double')).verdict).not.toBe('no')
  })
})

describe('roadChecks', () => {
  it('marks a vehicle over the ПДР limits', () => {
    expect(roadChecks(GOLF).every(c => c.ok)).toBe(true)
    const wide = roadChecks({ lengthMm: 13000, widthMm: 2550, heightMm: 4100 })
    expect(wide.map(c => c.ok)).toEqual([true, false, false])
  })
})

describe('sizeTips', () => {
  const keys = (d: Dims, shape = 'hatch' as const): string[] => sizeTips(d, shape).map(t => t.key)

  it('praises a tiny car and warns about a long, wide one', () => {
    expect(keys(FIAT_500)).toContain('tiny')
    expect(keys(X5)).toContain('wide')
    expect(keys(CAMRY)).not.toContain('tiny')
  })

  it('warns about mechanical parking and underground clearance only when it applies', () => {
    expect(keys(X5)).toContain('mechanical')
    expect(keys(GOLF)).not.toContain('mechanical')
    expect(keys({ lengthMm: 4000, widthMm: 1700, heightMm: 1500 })).not.toContain('mechanical')
    expect(keys(TRANSIT)).toContain('roofBox')
    expect(keys({ ...TRANSIT, heightMm: 2100 })).toContain('clearanceNo')
    expect(keys(GOLF)).not.toContain('clearanceNo')
  })

  it('gives a motorcycle one easy tip', () => {
    expect(sizeTips({ lengthMm: 2100, widthMm: 800, heightMm: 1150 }, 'moto')).toEqual([
      { key: 'moto', tone: 'easy', params: {} }
    ])
  })
})
