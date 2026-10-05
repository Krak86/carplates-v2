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
  it('ignores badge/slogan text that merely fits the VIN alphabet', () => {
    const reads = extractVins([
      { text: 'MINI COOPER CLUBMAN', score: 0.97 },
      { text: '7OJX1735PSISINGLE', score: 0.9 },
      { text: 'V.I.N WMWLN5105J2H03769', score: 0.95 }
    ])
    expect(reads[0]?.vin).toBe('WMWLN5105J2H03769')
    expect(reads.map(r => r.vin)).not.toContain('M1N1C00PERCLUBMAN')
  })
  it('does not turn a stock-photo watermark into a VIN', () => {
    // Real OCR of a Nissan chassis plate photo; the true read has one wrong letter, the watermark must still lose.
    const reads = extractVins([
      { text: 'PN8ERAC24TCA14792', score: 0.98 },
      { text: 'QR20 700728A', score: 0.94 },
      { text: 'COLOR,GUARNICION', score: 0.95 },
      { text: 'IMAGEID:2701628693', score: 0.99 }
    ])
    expect(reads.map(r => r.vin)).toEqual(['PN8ERAC24TCA14792'])
  })
  it('reports where each VIN sits, slicing a longer line down to the VIN word', () => {
    const box = { x: 0.1, y: 0.5, w: 0.8, h: 0.05 }
    const [read] = extractVins([{ text: 'VIN WMWLN5105J2H03769', score: 0.9, box }])
    expect(read?.vin).toBe('WMWLN5105J2H03769')
    // "VIN " is 4 of 21 characters, so the VIN starts 4/21 into the line and spans 17/21 of it.
    expect(read?.box?.x).toBeCloseTo(0.1 + (0.8 * 4) / 21)
    expect(read?.box?.w).toBeCloseTo((0.8 * 17) / 21)
  })
  it('unions the boxes of a VIN wrapped over two lines', () => {
    const [read] = extractVins([
      { text: '1M8GDM9A', score: 0.9, box: { x: 0.1, y: 0.1, w: 0.2, h: 0.05 } },
      { text: 'XKP042788', score: 0.9, box: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 } }
    ])
    expect(read?.box?.x).toBeCloseTo(0.1)
    expect(read?.box?.y).toBeCloseTo(0.1)
    expect(read?.box?.w).toBeCloseTo(0.3)
    expect(read?.box?.h).toBeCloseTo(0.15)
  })
  it('drops the asterisks stamped around a VIN (read as X) instead of the whole line', () => {
    // Real OCR of a stamped door-sill VIN: *KLATF08Y1VB363636* came back as XKLATF08Y1VB363636X.
    expect(extractVins([{ text: 'XKLATF08Y1VB363636X', score: 0.96 }])[0]?.vin).toBe('KLATF08Y1VB363636')
  })
  it('does not join an approval number onto a partial VIN read', () => {
    const reads = extractVins([
      { text: 'e9·92/61.0065.00', score: 0.87 },
      { text: 'BLCX11000237', score: 0.97 }
    ])
    expect(reads).toEqual([])
  })
  it('replaces a read with its look-alike fix when that turns an unknown prefix into a known one', () => {
    // Real OCR of an embossed Ford Thailand plate: "MNC…" read as "NNC…".
    const reads = extractVins([{ text: 'NNCLSFE405W491230', score: 0.98 }]).map(r => r.vin)
    expect(reads).toEqual(['MNCLSFE405W491230'])
  })
  it('leaves a read with a known prefix alone', () => {
    expect(extractVins([{ text: 'MNCLSFE405W491230', score: 0.98 }]).map(r => r.vin)).toEqual(['MNCLSFE405W491230'])
  })
  it('lists a VIN once even when its label shares the line (no shifted-window copies)', () => {
    const reads = extractVins([{ text: 'V.I.N. 3KPFT4DE1TE349095', score: 0.97 }])
    expect(reads.map(r => r.vin)).toEqual(['3KPFT4DE1TE349095'])
  })
  it('keeps two genuinely different VINs', () => {
    const reads = extractVins([
      { text: '3KPFT4DE1TE349095', score: 0.97 },
      { text: 'WMWLN5105J2H03769', score: 0.97 }
    ])
    expect(reads).toHaveLength(2)
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
