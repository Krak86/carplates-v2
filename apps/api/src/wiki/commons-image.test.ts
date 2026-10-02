import { describe, expect, it } from 'vitest'

import { pickCommonsCandidate, type CommonsCandidate } from './commons-image.js'

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
