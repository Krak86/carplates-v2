import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearShareTokens,
  daysLeft,
  forgetShareToken,
  pruneShareTokens,
  savedShareToken,
  saveShareToken,
  shareUrl
} from '@/lib/share-links'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const TOKEN = 'AAAAAAAAAAAAAAAAAAAAAA'
const future = (): string => new Date(Date.now() + 3 * 86_400_000).toISOString()

describe('share links stored on this device', () => {
  beforeEach(() => localStorage.clear())

  it('returns the saved token until the share expires', () => {
    saveShareToken(ID_A, TOKEN, future())
    expect(savedShareToken(ID_A)).toBe(TOKEN)

    saveShareToken(ID_B, TOKEN, new Date(Date.now() - 1000).toISOString())
    expect(savedShareToken(ID_B)).toBeNull()
    expect(savedShareToken('unknown')).toBeNull()
  })

  it('forgets one share, keeps only the ids the server still lists, and clears on sign-out', () => {
    saveShareToken(ID_A, TOKEN, future())
    saveShareToken(ID_B, TOKEN, future())

    forgetShareToken(ID_A)
    expect(savedShareToken(ID_A)).toBeNull()
    expect(savedShareToken(ID_B)).toBe(TOKEN)

    saveShareToken(ID_A, TOKEN, future())
    pruneShareTokens([{ id: ID_A }])
    expect(savedShareToken(ID_B)).toBeNull()
    expect(savedShareToken(ID_A)).toBe(TOKEN)

    clearShareTokens()
    expect(localStorage.getItem('carplates.share-links')).toBeNull()
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('carplates.share-links', '{nope')
    expect(savedShareToken(ID_A)).toBeNull()
    saveShareToken(ID_A, TOKEN, future())
    expect(savedShareToken(ID_A)).toBe(TOKEN)
  })

  it('builds /<plate>?p=<token> with the plate in Latin look-alikes', () => {
    expect(shareUrl('АА1234ВВ', TOKEN, 'https://carsua.app')).toBe(`https://carsua.app/AA1234BB?p=${TOKEN}`)
  })

  it('keeps a plate that is not a Ukrainian plate as is, encoded', () => {
    expect(shareUrl('ЩЩ', TOKEN, 'https://carsua.app')).toBe(
      `https://carsua.app/${encodeURIComponent('ЩЩ')}?p=${TOKEN}`
    )
  })

  it('counts whole days left, rounded up, never negative', () => {
    const now = Date.parse('2026-11-02T12:00:00Z')
    expect(daysLeft('2026-11-09T12:00:00Z', now)).toBe(7)
    expect(daysLeft('2026-11-02T13:00:00Z', now)).toBe(1)
    expect(daysLeft('2026-11-01T12:00:00Z', now)).toBe(0)
  })
})
