import {
  SHARE_EXPIRED,
  SHARE_LIMIT_REACHED,
  SHARE_NO_ORIGINAL,
  SHARE_NO_PLATE,
  SHARING_UNAVAILABLE
} from '@carplates/shared'

import { ApiError } from '@/lib/api'

/** The API's error code (the HTTP message) -> the i18n key shown to the user. Status is the fallback when the body is not ours. */
export function shareErrorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'photoShare.error.generic'
  if (error.message === SHARE_LIMIT_REACHED || error.status === 409) return 'photoShare.error.limit'
  if (error.message === SHARE_NO_PLATE || error.status === 422) return 'photoShare.error.noPlate'
  if (error.message === SHARING_UNAVAILABLE || error.status === 503) return 'photoShare.error.unavailable'
  if (error.message === SHARE_EXPIRED || error.status === 410) return 'photoShare.error.expired'
  switch (error.status) {
    case 401:
      return 'photoShare.error.signIn'
    case 413:
    case 400:
      return 'photoShare.error.badImage'
    case 429:
      return 'photoShare.error.rateLimited'
    default:
      return 'photoShare.error.generic'
  }
}

/** Saving the blur editor: a 409 means the unblurred upload is gone (not the share limit), the rest is as for creating. */
export function retouchErrorKey(error: unknown): string {
  if (error instanceof ApiError && (error.message === SHARE_NO_ORIGINAL || error.status === 409))
    return 'photoShare.edit.gone'
  return shareErrorKey(error)
}

/** The Share button: a shrunk, metadata-free copy of a photo this browser picked, recognized from a plate (never a certificate). */
export function isShareable(
  photo: { file: File | null; mode: 'plate' | 'vin'; settled: boolean; fromDocument: boolean },
  candidates: number
): boolean {
  return photo.file !== null && photo.mode === 'plate' && photo.settled && !photo.fromDocument && candidates > 0
}
