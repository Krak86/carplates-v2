import { describe, expect, it } from 'vitest'
import { SHARE_EXPIRED, SHARE_LIMIT_REACHED, SHARE_NO_PLATE, SHARING_UNAVAILABLE } from '@carplates/shared'

import { isShareable, shareErrorKey } from '@/components/share-photo.helpers'
import { ApiError } from '@/lib/api'

describe('shareErrorKey', () => {
  it.each([
    [409, SHARE_LIMIT_REACHED, 'photoShare.error.limit'],
    [422, SHARE_NO_PLATE, 'photoShare.error.noPlate'],
    [503, SHARING_UNAVAILABLE, 'photoShare.error.unavailable'],
    [410, SHARE_EXPIRED, 'photoShare.error.expired']
  ])('maps %i %s', (status, code, key) => {
    expect(shareErrorKey(new ApiError(status, code))).toBe(key)
  })

  it('falls back on the status, then on a generic message', () => {
    expect(shareErrorKey(new ApiError(429, 'Too Many Requests'))).toBe('photoShare.error.rateLimited')
    expect(shareErrorKey(new ApiError(401, 'Unauthorized'))).toBe('photoShare.error.signIn')
    expect(shareErrorKey(new ApiError(500, 'boom'))).toBe('photoShare.error.generic')
    expect(shareErrorKey(new Error('network'))).toBe('photoShare.error.generic')
  })
})

describe('isShareable', () => {
  const file = new File(['x'], 'a.jpg')
  const base = { file, mode: 'plate' as const, settled: true, fromDocument: false }

  it('allows a settled plate photo with reads', () => {
    expect(isShareable(base, 1)).toBe(true)
  })

  it('hides Share for certificates, VIN photos, shared links, pending and failed reads', () => {
    expect(isShareable({ ...base, fromDocument: true }, 1)).toBe(false)
    expect(isShareable({ ...base, mode: 'vin' }, 1)).toBe(false)
    expect(isShareable({ ...base, file: null }, 1)).toBe(false)
    expect(isShareable({ ...base, settled: false }, 1)).toBe(false)
    expect(isShareable(base, 0)).toBe(false)
  })
})
