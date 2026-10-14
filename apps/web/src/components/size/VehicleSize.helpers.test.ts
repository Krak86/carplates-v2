import type { RdwSpecs } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  completeSize,
  mergeSize,
  parseSizeTab,
  sizeClass,
  sizeShape,
  vinWheelbaseMm,
  type SizeFigures
} from '@/components/size/VehicleSize.helpers'

const range = (median: number) => ({ min: median - 10, median, max: median + 10 })
const rdw = (over: Partial<RdwSpecs>): RdwSpecs => over as RdwSpecs

const NONE: SizeFigures = { lengthMm: null, widthMm: null, heightMm: null, wheelbaseMm: null }

describe('mergeSize', () => {
  it('prefers RDW, then Wikipedia, then the VIN wheelbase, per field', () => {
    const figures = mergeSize({
      rdw: rdw({ lengthCm: range(428), heightCm: null }),
      wiki: { lengthMm: 4000, widthMm: 1790, heightMm: 1456 },
      vinWheelbaseMm: 2636
    })
    expect(figures.lengthMm).toMatchObject({ value: 4280, source: 'rdw', spread: { min: 4180, max: 4380 } })
    expect(figures.widthMm).toEqual({ value: 1790, source: 'wiki' })
    expect(figures.heightMm).toEqual({ value: 1456, source: 'wiki' })
    expect(figures.wheelbaseMm).toEqual({ value: 2636, source: 'vin' })
  })

  it('leaves a field with no source empty', () => {
    expect(mergeSize({})).toEqual(NONE)
  })
})

describe('vinWheelbaseMm', () => {
  it('converts inches and averages From / To', () => {
    expect(vinWheelbaseMm(new Map([['Wheel Base (inches) From', '100']]))).toBe(2540)
    const both = new Map([
      ['Wheel Base (inches) From', '100'],
      ['Wheel Base (inches) To', '110']
    ])
    expect(vinWheelbaseMm(both)).toBe(2667)
    expect(vinWheelbaseMm(new Map([['Wheel Base (inches) From', 'n/a']]))).toBeNull()
    expect(vinWheelbaseMm(null)).toBeNull()
  })
})

describe('sizeShape', () => {
  it('reads the registry body first, ignoring the licence suffix', () => {
    expect(sizeShape({ kind: 'ЛЕГКОВИЙ', body: 'УНІВЕРСАЛ-B' })).toEqual({ shape: 'wagon', known: true })
    expect(sizeShape({ kind: 'ЛЕГКОВИЙ', body: 'ХЕТЧБЕК', rdwBodyTypes: [{ key: 'sedan', share: 1 }] })?.shape).toBe(
      'hatch'
    )
  })

  it('falls back to RDW, then NHTSA, then a generic car', () => {
    expect(sizeShape({ kind: 'ЛЕГКОВИЙ', rdwBodyTypes: [{ key: 'MPV', share: 0.9 }] })?.shape).toBe('mpv')
    expect(sizeShape({ kind: 'ЛЕГКОВИЙ', vinBodyClass: 'Sport Utility Vehicle (SUV)' })?.shape).toBe('suv')
    expect(sizeShape({ kind: 'ЛЕГКОВИЙ' })).toEqual({ shape: 'car', known: false })
  })

  it('maps non-passenger kinds and hides trailers', () => {
    expect(sizeShape({ kind: 'АВТОБУС' })?.shape).toBe('bus')
    expect(sizeShape({ kind: 'МОТОЦИКЛ' })?.shape).toBe('moto')
    expect(sizeShape({ kind: 'ВАНТАЖНИЙ', body: 'СЕДАН' })?.shape).toBe('truck')
    expect(sizeShape({ kind: 'ПРИЧІП' })).toBeNull()
  })
})

describe('sizeClass', () => {
  it('cuts by length with different edges for hatchbacks and sedans', () => {
    expect(sizeClass(3600, 'hatch')?.cls).toBe('A')
    expect(sizeClass(4300, 'hatch')?.cls).toBe('C')
    expect(sizeClass(4300, 'sedan')?.cls).toBe('B')
    expect(sizeClass(4885, 'sedan')?.cls).toBe('D')
    expect(sizeClass(5200, 'sedan')?.cls).toBe('F')
  })

  it('gives SUVs and MPVs their own segment with a size word', () => {
    expect(sizeClass(4100, 'suv')).toEqual({ cls: 'J', sub: 0 })
    expect(sizeClass(4900, 'mpv')).toEqual({ cls: 'M', sub: 3 })
  })

  it('has no class for motorcycles, buses and trucks', () => {
    expect(sizeClass(2100, 'moto')).toBeNull()
    expect(sizeClass(12000, 'bus')).toBeNull()
  })
})

describe('completeSize', () => {
  const known = (v: number) => ({ value: v, source: 'rdw' as const })

  it('keeps complete figures untouched', () => {
    const full: SizeFigures = {
      lengthMm: known(4284),
      widthMm: known(1789),
      heightMm: known(1456),
      wheelbaseMm: known(2636)
    }
    expect(completeSize(full, { shape: 'hatch', known: true })).toEqual({
      figures: full,
      estimated: [],
      typicalOnly: false
    })
  })

  it('forecasts the gaps from the known length and tags them', () => {
    const result = completeSize({ ...NONE, lengthMm: known(4200) }, { shape: 'hatch', known: true })
    expect(result?.estimated).toEqual(['widthMm', 'heightMm', 'wheelbaseMm'])
    expect(result?.figures.wheelbaseMm).toEqual({ value: 2600, source: 'estimate' })
    expect(result?.typicalOnly).toBe(false)
  })

  it('scales a bigger car up, wheelbase fastest', () => {
    const small = completeSize({ ...NONE, lengthMm: known(4200) }, { shape: 'sedan', known: true })
    const big = completeSize({ ...NONE, lengthMm: known(5000) }, { shape: 'sedan', known: true })
    const wb = (r: typeof small): number => r?.figures.wheelbaseMm?.value ?? 0
    const wd = (r: typeof small): number => r?.figures.widthMm?.value ?? 0
    expect(wb(big)).toBeGreaterThan(wb(small))
    expect(wd(big) / wd(small)).toBeLessThan(wb(big) / wb(small))
  })

  it('shows the typical shape only when the body style is known', () => {
    expect(completeSize(NONE, { shape: 'suv', known: true })).toMatchObject({ typicalOnly: true })
    expect(completeSize(NONE, { shape: 'car', known: false })).toBeNull()
    expect(completeSize(NONE, null)).toBeNull()
  })

  it('forecasts nothing for buses and trucks', () => {
    expect(completeSize(NONE, { shape: 'bus', known: true })).toBeNull()
    const partial = completeSize({ ...NONE, lengthMm: known(12000) }, { shape: 'bus', known: true })
    expect(partial?.estimated).toEqual([])
    expect(partial?.figures.widthMm).toBeNull()
  })
})

describe('parseSizeTab', () => {
  it('accepts the known tabs and defaults the rest', () => {
    expect(parseSizeTab('garage')).toBe('garage')
    expect(parseSizeTab('nope')).toBe('schema')
    expect(parseSizeTab(null)).toBe('schema')
  })
})
