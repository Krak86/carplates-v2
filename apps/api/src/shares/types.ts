import type { Readable } from 'node:stream'

import type { PlateCandidate, ShareRemoved } from '@carplates/shared'

export type ShareFormat = 'jpeg' | 'webp'

/** Private object storage for the stored copies (R2 in production). */
export type ShareObjectStore = {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  /** `null` when the object does not exist. */
  get(key: string): Promise<{ stream: Readable; length: number | null } | null>
  /** Idempotent: a missing object is not an error. */
  delete(key: string): Promise<void>
}

export const SHARE_OBJECT_STORE = 'SHARE_OBJECT_STORE'

export type ShareRecord = {
  id: string
  userId: string
  objectKey: string
  plate: string
  candidates: PlateCandidate[]
  bytes: number
  /** Pixel size of the stored copy; null for shares made before it was recorded. */
  width: number | null
  height: number | null
  removed: ShareRemoved | null
  /** The private unblurred upload while the blur editor may still need it; null once confirmed, cancelled or swept. */
  originalKey: string | null
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
}

export type NewShare = Pick<
  ShareRecord,
  | 'id'
  | 'userId'
  | 'objectKey'
  | 'originalKey'
  | 'plate'
  | 'candidates'
  | 'bytes'
  | 'width'
  | 'height'
  | 'removed'
  | 'expiresAt'
> & {
  tokenHash: string
}

/** Metadata answer for the SPA's `<meta>` injection: `null` = expired, deleted or unknown. */
export type ShareMeta = {
  plate: string
  expiresAt: Date
  width: number | null
  height: number | null
} | null
