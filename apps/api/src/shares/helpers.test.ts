import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  SHARE_MAX_SIDE,
  SHARE_STORED_MAX_BYTES,
  cacheSecondsLeft,
  downscaleForShare,
  findForbiddenMetadata,
  hashShareToken,
  newShareToken,
  sniffShareFormat
} from './helpers.js'

const raw = (width: number, height: number, noise = false) => {
  const data = Buffer.alloc(width * height * 3)
  for (let i = 0; i < data.length; i++) data[i] = noise ? Math.floor(Math.random() * 256) : (i * 7) % 256
  return sharp(data, { raw: { width, height, channels: 3 } })
}

/** A hand-made marker segment: FF <marker> <length incl. itself> <payload>. */
const segment = (marker: number, payload = 'x'): Buffer => {
  const body = Buffer.from(payload)
  const head = Buffer.alloc(4)
  head[0] = 0xff
  head[1] = marker
  head.writeUInt16BE(body.length + 2, 2)
  return Buffer.concat([head, body])
}

/** Inserts a segment straight after SOI. */
const withSegment = (jpeg: Buffer, marker: number): Buffer =>
  Buffer.concat([jpeg.subarray(0, 2), segment(marker), jpeg.subarray(2)])

describe('share token', () => {
  it('is 128 random bits as 22 base64url chars, and unique', () => {
    const a = newShareToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(newShareToken()).not.toBe(a)
  })

  it('is stored as its SHA-256 hex, never as the token', () => {
    const token = newShareToken()
    const hash = hashShareToken(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(token)
    expect(hashShareToken(token)).toBe(hash)
    // Known SHA-256 test vector.
    expect(hashShareToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('sniffShareFormat', () => {
  it('reads the magic bytes, not a MIME type', async () => {
    expect(sniffShareFormat(await raw(8, 8).jpeg().toBuffer())).toBe('jpeg')
    expect(sniffShareFormat(await raw(8, 8).webp().toBuffer())).toBe('webp')
    expect(sniffShareFormat(await raw(8, 8).png().toBuffer())).toBeNull()
    expect(sniffShareFormat(Buffer.from('GIF89a....'))).toBeNull()
    expect(sniffShareFormat(Buffer.alloc(0))).toBeNull()
  })
})

describe('findForbiddenMetadata', () => {
  it('passes a clean JPEG and a clean WebP', async () => {
    expect(findForbiddenMetadata(await raw(64, 64).jpeg().toBuffer(), 'jpeg')).toBeNull()
    expect(findForbiddenMetadata(await raw(64, 64).webp().toBuffer(), 'webp')).toBeNull()
  })

  it('passes a progressive JPEG (several scans, restart-free entropy data)', async () => {
    expect(findForbiddenMetadata(await raw(128, 128, true).jpeg({ progressive: true }).toBuffer(), 'jpeg')).toBeNull()
  })

  it('rejects an APP1 (EXIF) segment', async () => {
    const jpeg = await raw(64, 64)
      .jpeg()
      .withExif({ IFD0: { Copyright: 'someone' } })
      .toBuffer()
    expect(findForbiddenMetadata(jpeg, 'jpeg')).toContain('APP1')
  })

  it('rejects APP13 (IPTC) and COM (comment) segments', async () => {
    const clean = await raw(64, 64).jpeg().toBuffer()
    expect(findForbiddenMetadata(withSegment(clean, 0xed), 'jpeg')).toContain('APP13')
    expect(findForbiddenMetadata(withSegment(clean, 0xfe), 'jpeg')).toContain('COM')
  })

  it('allows harmless segments such as APP0', async () => {
    const clean = await raw(64, 64).jpeg().toBuffer()
    expect(findForbiddenMetadata(withSegment(clean, 0xe0), 'jpeg')).toBeNull()
  })

  it('rejects a COM segment hidden after the first scan', async () => {
    const clean = await raw(64, 64).jpeg().toBuffer()
    const eoi = clean.length - 2
    expect(clean[eoi]).toBe(0xff)
    expect(clean[eoi + 1]).toBe(0xd9)
    const tricky = Buffer.concat([clean.subarray(0, eoi), segment(0xfe, 'payload'), clean.subarray(eoi)])
    expect(findForbiddenMetadata(tricky, 'jpeg')).toContain('COM')
  })

  it('rejects EXIF and XMP chunks in a WebP', async () => {
    const exif = await raw(64, 64)
      .webp()
      .withExif({ IFD0: { Copyright: 'someone' } })
      .toBuffer()
    expect(findForbiddenMetadata(exif, 'webp')).toContain('EXIF')
    const xmp = await raw(64, 64).webp().withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta>').toBuffer()
    expect(findForbiddenMetadata(xmp, 'webp')).toContain('XMP')
  })

  it('reports a truncated or malformed JPEG instead of passing it', () => {
    expect(findForbiddenMetadata(Buffer.from([0xff, 0xd8, 0xff]), 'jpeg')).toMatch(/truncated|malformed/)
    expect(findForbiddenMetadata(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00]), 'jpeg')).toMatch(/malformed/)
  })
})

describe('downscaleForShare', () => {
  it('caps the longest side at 1600 px and writes a metadata-free JPEG', async () => {
    const out = await downscaleForShare(await raw(3200, 2000).jpeg().toBuffer())
    expect(out).not.toBeNull()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(SHARE_MAX_SIDE)
    expect(meta.height).toBe(1000)
    expect(meta.exif).toBeUndefined()
    expect((out as Buffer).byteLength).toBeLessThanOrEqual(SHARE_STORED_MAX_BYTES)
  })

  it('never enlarges a small photo', async () => {
    const out = await downscaleForShare(await raw(400, 300).jpeg().toBuffer())
    const meta = await sharp(out as Buffer).metadata()
    expect([meta.width, meta.height]).toEqual([400, 300])
  })

  it('steps the quality down to fit the hard cap, or gives up with null', async () => {
    // Pure noise at 1600 px is far over 600 KB even at q50.
    expect(await downscaleForShare(await raw(1600, 1600, true).png().toBuffer())).toBeNull()
    // Several mozjpeg passes over a noise image: ~5 s on a shared CI runner, so the default timeout is too tight.
  }, 30_000)
})

describe('cacheSecondsLeft', () => {
  const now = Date.parse('2026-11-02T12:00:00Z')

  it('is the time left, capped at an hour, never negative', () => {
    expect(cacheSecondsLeft(new Date(now + 90_000), now)).toBe(90)
    expect(cacheSecondsLeft(new Date(now + 7 * 86_400_000), now)).toBe(3600)
    expect(cacheSecondsLeft(new Date(now - 1000), now)).toBe(0)
  })
})
