import { describe, it, expect } from 'vitest'

import { extractVins, vinCheckDigitOk } from './vin-read.js'

describe('vinCheckDigitOk', () => {
  it('accepts the canonical FMVSS example', () => {
    expect(vinCheckDigitOk('1M8GDM9AXKP042788')).toBe(true)
  })
  it('rejects a wrong check digit', () => {
    expect(vinCheckDigitOk('1M8GDM9A1KP042788')).toBe(false)
  })
})

describe('extractVins', () => {
  it('finds a VIN inside noisy text and fixes O/I confusions', () => {
    const [top] = extractVins([{ text: 'VIN: 1M8GDM9AXKPO42788', score: 0.9 }])
    expect(top?.vin).toBe('1M8GDM9AXKP042788')
    expect(top?.checkDigitOk).toBe(true)
  })
  it('joins a VIN wrapped over two lines', () => {
    const reads = extractVins([
      { text: '1M8GDM9A', score: 0.95 },
      { text: 'XKP042788', score: 0.8 }
    ])
    expect(reads[0]?.vin).toBe('1M8GDM9AXKP042788')
    expect(reads[0]?.score).toBe(0.8)
  })
  it('ranks a passing check digit above a more confident failing read', () => {
    const reads = extractVins([
      { text: '1M8GDM9A1KP042788', score: 0.99 },
      { text: '1M8GDM9AXKP042788', score: 0.5 }
    ])
    expect(reads[0]?.vin).toBe('1M8GDM9AXKP042788')
  })
  it('prefers a line that is exactly a VIN over junk windows that pass the check digit', () => {
    // Real registration-certificate OCR: the true (EU-market, check-digit-failing) VIN sits next to long labels.
    const reads = extractVins([
      { text: 'U5YHN512BDL007162', score: 0.99 },
      { text: 'TpaHCnopTHOrO 3aCo6y', score: 0.79 },
      { text: 'Vehicleidentification number', score: 0.94 },
      { text: 'Chassis number(body,frame)', score: 0.96 },
      { text: 'OBHa MaCa,Kr 1880 1273 1591 105', score: 0.8 }
    ])
    expect(vinCheckDigitOk('U5YHN512BDL007162')).toBe(false)
    expect(reads[0]?.vin).toBe('U5YHN512BDL007162')
  })
  it('does not glue a full VIN line to the next line', () => {
    const vins = extractVins([
      { text: 'U5YHN512BDL007162', score: 0.99 },
      { text: 'Vehicleidentification number', score: 0.94 }
    ]).map(r => r.vin)
    expect(vins).toEqual(['U5YHN512BDL007162'])
  })
  it('returns nothing without a 17-char run', () => {
    expect(extractVins([{ text: 'MADE IN GERMANY', score: 0.9 }])).toEqual([])
  })
})
