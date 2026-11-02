import { createHash, randomBytes } from 'node:crypto'

import sharp from 'sharp'

import type { ShareFormat } from './types.js'

/** Global free-tier guard: no new shares once the active rows hold this many bytes (R2 free tier is 10 GB-month). */
export const SHARE_STORAGE_CAP_BYTES = 8_000_000_000
/** The stored copy: longest side, JPEG quality (stepped down until it fits) and the hard size cap. */
export const SHARE_MAX_SIDE = 1600
export const SHARE_JPEG_QUALITIES = [80, 70, 60, 50] as const
export const SHARE_STORED_MAX_BYTES = 600 * 1024
/** Decode bound for `sharp` (the client's `shrinkImage` stays under max side 4608 px, ~21 MP). */
const MAX_INPUT_PIXELS = 50_000_000

/** 128 random bits as base64url (22 chars). Only `hashShareToken(token)` is stored. */
export const newShareToken = (): string => randomBytes(16).toString('base64url')
export const hashShareToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/** Image type from the magic bytes (the client-sent MIME type is never trusted); `null` = not JPEG/WebP. */
export function sniffShareFormat(buf: Buffer): ShareFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP')
    return 'webp'
  return null
}

const JPEG_FORBIDDEN: Record<number, string> = { 0xe1: 'APP1 (EXIF/XMP)', 0xed: 'APP13 (IPTC)', 0xfe: 'COM (comment)' }
const WEBP_FORBIDDEN = new Set(['EXIF', 'XMP '])

/**
 * Cheap marker walk (no dependency): the reason a JPEG/WebP still carries metadata (EXIF/XMP, IPTC, comment), or `null`
 * when clean. A truncated or malformed structure is reported too. The client's `shrinkImage` already strips all of this,
 * so a hit means a hand-made upload. The stored copy is re-encoded anyway; this is defence in depth.
 */
export function findForbiddenMetadata(buf: Buffer, format: ShareFormat): string | null {
  return format === 'jpeg' ? walkJpeg(buf) : walkWebp(buf)
}

function walkJpeg(buf: Buffer): string | null {
  let i = 2 // after SOI
  while (i < buf.length) {
    if (buf[i] !== 0xff) return 'malformed JPEG'
    const marker = buf[i + 1]
    if (marker === undefined) return 'truncated JPEG'
    if (marker === 0xff) {
      i += 1 // fill byte
      continue
    }
    if (marker === 0xd9) return null // EOI
    // Standalone markers have no length: TEM, RSTn, SOI.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2
      continue
    }
    if (i + 4 > buf.length) return 'truncated JPEG'
    const forbidden = JPEG_FORBIDDEN[marker]
    if (forbidden) return forbidden
    const length = buf.readUInt16BE(i + 2)
    if (length < 2) return 'malformed JPEG'
    i += 2 + length
    if (marker === 0xda) i = skipEntropyData(buf, i) // SOS: scan data follows its header, up to the next real marker
  }
  return 'truncated JPEG'
}

/** Index of the next marker after entropy-coded data (`FF 00` stuffing and `FF D0-D7` restarts are part of the data). */
function skipEntropyData(buf: Buffer, from: number): number {
  let i = from
  while (i + 1 < buf.length) {
    if (buf[i] === 0xff) {
      const next = buf[i + 1] as number
      if (next !== 0x00 && !(next >= 0xd0 && next <= 0xd7)) return i
    }
    i++
  }
  return buf.length
}

function walkWebp(buf: Buffer): string | null {
  let i = 12 // after "RIFF" size "WEBP"
  while (i + 8 <= buf.length) {
    const fourcc = buf.toString('latin1', i, i + 4)
    if (WEBP_FORBIDDEN.has(fourcc)) return `${fourcc.trim()} chunk`
    const size = buf.readUInt32LE(i + 4)
    i += 8 + size + (size % 2) // chunks are padded to an even size
  }
  return null
}

/**
 * The stored copy: longest side <= 1600 px, JPEG (mozjpeg), quality stepped down from 80 until it is under the hard cap.
 * `sharp` writes no metadata unless asked. `null` = even the lowest quality is over the cap.
 */
export async function downscaleForShare(input: Buffer): Promise<Buffer | null> {
  const resized = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).resize({
    width: SHARE_MAX_SIDE,
    height: SHARE_MAX_SIDE,
    fit: 'inside',
    withoutEnlargement: true
  })
  for (const quality of SHARE_JPEG_QUALITIES) {
    const out = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer()
    if (out.byteLength <= SHARE_STORED_MAX_BYTES) return out
  }
  return null
}

/** Seconds a response may be cached: never longer than the time left, never more than an hour, never negative. */
export const cacheSecondsLeft = (expiresAt: Date, now = Date.now()): number =>
  Math.max(0, Math.min(3600, Math.floor((expiresAt.getTime() - now) / 1000)))
