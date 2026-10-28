import { describe, expect, it } from 'vitest'

import {
  US_EU_DIFF_WARN,
  agedValuesDiffer,
  usBasePriceUsd,
  usEuGap,
  usValue,
  usdToEur
} from '@/components/us-value.helpers'

const FX = { eurUah: 50, usdUah: 45 }

describe('usBasePriceUsd', () => {
  it('reads the NHTSA field', () => {
    expect(usBasePriceUsd(new Map([['Base Price ($)', '21140.00']]))).toBe(21140)
  })
  it('is null when missing, zero or not a number', () => {
    expect(usBasePriceUsd(new Map())).toBeNull()
    expect(usBasePriceUsd(new Map([['Base Price ($)', '0']]))).toBeNull()
    expect(usBasePriceUsd(new Map([['Base Price ($)', 'n/a']]))).toBeNull()
  })
})

describe('usdToEur', () => {
  it('goes through the hryvnia cross rate', () => {
    expect(usdToEur(1000, FX)).toBeCloseTo(900)
  })
})

describe('usValue', () => {
  const base = { baseUsd: 21140, fx: FX, makeYear: 2018, nowYear: 2026, fuel: 'БЕНЗИН', capacityCc: 2488 }

  it('depreciates the converted price and adds customs', () => {
    const v = usValue(base)
    expect(v).not.toBeNull()
    expect(v!.baseEur).toBeCloseTo(19026)
    expect(v!.midEur).toBeLessThan(v!.baseEur)
    expect(v!.lowEur).toBeLessThan(v!.midEur)
    expect(v!.highEur).toBeGreaterThan(v!.midEur)
    expect(v!.mid.totalEur).toBeGreaterThan(v!.midEur)
    expect(v!.mid.exciseKnown).toBe(true)
  })

  it('has a wider range than the EU estimate', () => {
    expect(usValue(base)!.spread).toBeGreaterThan(0.15)
  })

  it('is null for a negative age', () => {
    expect(usValue({ ...base, makeYear: 2030 })).toBeNull()
  })
})

describe('usEuGap', () => {
  it('flags a large gap', () => {
    expect(usEuGap(19000, 12000)?.differs).toBe(true)
    expect(usEuGap(13000, 12000)?.differs).toBe(false)
    expect(Math.abs(usEuGap(13000, 12000)!.gap)).toBeLessThan(US_EU_DIFF_WARN)
  })
  it('is null without both prices', () => {
    expect(usEuGap(19000, null)).toBeNull()
    expect(usEuGap(0, 12000)).toBeNull()
  })
})

describe('agedValuesDiffer', () => {
  it('tolerates the EU value running higher because of VAT and BPM', () => {
    expect(agedValuesDiffer(9000, 12000)).toBe(false)
    expect(agedValuesDiffer(13000, 12000)).toBe(false)
  })
  it('flags a US value far below or above the EU one', () => {
    expect(agedValuesDiffer(4500, 14100)).toBe(true)
    expect(agedValuesDiffer(20000, 12000)).toBe(true)
  })
  it('is false without both', () => {
    expect(agedValuesDiffer(0, 12000)).toBe(false)
  })
})
