import { describe, expect, it } from 'vitest'

import {
  hasStandaloneYear,
  isModelYearTitle,
  pickCommonsCandidate,
  scoreCommonsTitle,
  type CommonsCandidate
} from './commonsImage.js'

const file = (title: string, width = 3000, height = 2000, mime = 'image/jpeg'): CommonsCandidate => ({
  title: `File:${title}`,
  mime,
  width,
  height
})

describe('pickCommonsCandidate', () => {
  it('rejects date-stamped filenames that merely contain the year', () => {
    const picked = pickCommonsCandidate(
      [file('2006 Honda CR-V (RD7 MY06) wagon (2008-11-12).jpg'), file('2008 Honda CR-V EX 4WD.jpg')],
      'CR-V',
      2008
    )
    expect(picked?.title).toBe('File:2008 Honda CR-V EX 4WD.jpg')
  })

  it('prefers exterior shots over detail shots', () => {
    const picked = pickCommonsCandidate(
      [file('2008 Honda CR-V interior.jpg'), file('2008 Honda CR-V EX front.jpg')],
      'CR-V',
      2008
    )
    expect(picked?.title).toBe('File:2008 Honda CR-V EX front.jpg')
  })

  it('rejects portrait, small, non-jpeg and wrong-model files', () => {
    const picked = pickCommonsCandidate(
      [
        file('2008 Honda CR-V portrait.jpg', 2000, 3000),
        file('2008 Honda CR-V small.jpg', 400, 300),
        file('2008 Honda CR-V diagram.png', 3000, 2000, 'image/png'),
        file('2008 Honda Civic.jpg')
      ],
      'CR-V',
      2008
    )
    expect(picked).toBeNull()
  })

  it('keeps search order on equal scores', () => {
    const picked = pickCommonsCandidate([file('2008 Honda CR-V A.jpg'), file('2008 Honda CR-V B.jpg')], 'CR-V', 2008)
    expect(picked?.title).toBe('File:2008 Honda CR-V A.jpg')
  })
})

describe('scoreCommonsTitle', () => {
  it('needs the standalone year and the model, and ranks front above interior and rear', () => {
    expect(scoreCommonsTitle('File:Kia Ceed 2018.jpg', 'Ceed', 2019)).toBeNull()
    expect(scoreCommonsTitle('File:2018 Kia Rio.jpg', 'Ceed', 2018)).toBeNull()
    const front = scoreCommonsTitle('File:2018 Kia Ceed front.jpg', 'Ceed', 2018)!
    const rear = scoreCommonsTitle('File:2018 Kia Ceed rear.jpg', 'Ceed', 2018)!
    const interior = scoreCommonsTitle('File:2018 Kia Ceed interior.jpg', 'Ceed', 2018)!
    expect(front).toBeGreaterThan(rear)
    expect(rear).toBeGreaterThan(interior)
  })
})

describe('model-year-only scoring', () => {
  const OLD_CAR = 'File:Auto BMW 5 Series (E28) Moscow Marshala Zhukova Prospekt Т203РА50 2026-09 1788629036.jpg'

  it('does not read a year-month photo stamp as the year', () => {
    expect(hasStandaloneYear(OLD_CAR, 2026)).toBe(false)
    expect(hasStandaloneYear('File:Kia Ceed 2026-09-03.jpg', 2026)).toBe(false)
    expect(hasStandaloneYear('File:Kia Ceed 2026.jpg', 2026)).toBe(true)
  })

  it('accepts a title that starts with the year or carries it in the generation parentheses', () => {
    expect(isModelYearTitle('File:2026 Toyota RAV4 PHEV GR Sport.jpg', 2026)).toBe(true)
    expect(isModelYearTitle('File:Mercedes-Benz GLC 300 4MATIC (X254, 2026) (55212389860).jpg', 2026)).toBe(true)
    expect(isModelYearTitle('File:Audi Q3 2.0 TFSI (2026) (55206166457).jpg', 2026)).toBe(true)
  })

  it('rejects a bare year that is only an event or a photo date', () => {
    expect(isModelYearTitle('File:Škoda Elroq RS Rutesheimer Autoschau 2026 IMG 6752.jpg', 2026)).toBe(false)
    expect(isModelYearTitle('File:2026-09-03 Kia Ceed.jpg', 2026)).toBe(false)
    expect(isModelYearTitle('File:Land Rover Defender (Lugano, 2026).jpg', 2026)).toBe(false)
    expect(isModelYearTitle('File:Toyota Land Cruiser FJ40 Hardtop (GIIAS 2026).jpg', 2026)).toBe(false)
    expect(isModelYearTitle('File:Einsatzfahrzeug Skoda Superb der KaPo (2026).jpg', 2026)).toBe(false)
  })

  it('only the strict mode drops an event photo', () => {
    const title = 'File:Mazda CX-5 at GIIAS 2026 front.jpg'
    expect(scoreCommonsTitle(title, 'CX-5', 2026)).not.toBeNull()
    expect(scoreCommonsTitle(title, 'CX-5', 2026, true)).toBeNull()
  })
})
