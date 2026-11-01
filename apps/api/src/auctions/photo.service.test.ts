import { BadRequestException, NotFoundException } from '@nestjs/common'
import sharp from 'sharp'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PHOTO_WIDTHS, photoParamSchema, photoQuerySchema } from './photo.schema.js'
import { MAX_PHOTO_BYTES, PhotoService } from './photo.service.js'

const DOC = '0123456789abcdef0123456789abcdef'
let jpeg: Buffer

beforeAll(async () => {
  jpeg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#3366aa' } })
    .jpeg()
    .toBuffer()
})
afterEach(() => vi.unstubAllGlobals())

const headers = (type: string | null, length?: number): Headers => {
  const h = new Headers()
  if (type) h.set('content-type', type)
  if (length !== undefined) h.set('content-length', String(length))
  return h
}

/** HEAD then GET of one document; `head` / `get` override the answers. */
function stubFetch(over: { head?: Partial<Response>; get?: Partial<Response>; body?: Buffer } = {}) {
  const body = over.body ?? jpeg
  const fn = vi.fn((_url: string, init?: RequestInit) =>
    Promise.resolve(
      init?.method === 'HEAD'
        ? ({ ok: true, headers: headers('image/jpeg', body.length), ...over.head } as Response)
        : ({
            ok: true,
            headers: headers('image/jpeg', body.length),
            arrayBuffer: () => Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.length)),
            ...over.get
          } as Response)
    )
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('photo params', () => {
  it('accepts only a 32-hex document id', () => {
    expect(photoParamSchema.safeParse({ docId: DOC }).success).toBe(true)
    for (const docId of [
      '',
      'abc',
      DOC.toUpperCase(),
      `${DOC}0`,
      '../../etc/passwd',
      'https://evil.test/x',
      `${DOC.slice(1)}g`
    ])
      expect(photoParamSchema.safeParse({ docId }).success).toBe(false)
  })

  it('width defaults to 320 and must be on the list', () => {
    expect(photoQuerySchema.parse({}).w).toBe(320)
    for (const w of PHOTO_WIDTHS) expect(photoQuerySchema.parse({ w: String(w) }).w).toBe(w)
    for (const w of ['100', '321', '0', '-320', 'abc', '3200', '320.5'])
      expect(photoQuerySchema.safeParse({ w }).success).toBe(false)
  })
})

describe('PhotoService.resize', () => {
  it('fetches the fixed Prozorro host, HEAD first, and returns a WebP of the asked width', async () => {
    const fetchFn = stubFetch()
    const out = await new PhotoService().resize(DOC, 320)
    const meta = await sharp(out).metadata()
    expect(meta).toMatchObject({ format: 'webp', width: 320, height: 213 })
    expect(out.length).toBeLessThan(jpeg.length)
    expect(fetchFn.mock.calls.map(([url, init]) => [url, init?.method ?? 'GET'])).toEqual([
      [`https://procedure.prozorro.sale/api/documents/public/${DOC}`, 'HEAD'],
      [`https://procedure.prozorro.sale/api/documents/public/${DOC}`, 'GET']
    ])
  })

  it('never enlarges a small original', async () => {
    const small = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#aaa' } })
      .png()
      .toBuffer()
    stubFetch({
      body: small,
      head: { headers: headers('image/png', small.length) },
      get: { headers: headers('image/png') }
    })
    expect((await sharp(await new PhotoService().resize(DOC, 960)).metadata()).width).toBe(200)
  })

  it('rejects an unsupported width and a bad id before any request', async () => {
    const fetchFn = stubFetch()
    const service = new PhotoService()
    await expect(service.resize(DOC, 500)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.resize('../x', 320)).rejects.toBeInstanceOf(BadRequestException)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('404 for a missing document, a non-image (PDF) and an oversize original (HEAD)', async () => {
    const service = new PhotoService()
    stubFetch({ head: { ok: false } })
    await expect(service.resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
    stubFetch({ head: { headers: headers('application/pdf', 1000) } })
    await expect(service.resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
    const fetchFn = stubFetch({ head: { headers: headers('image/jpeg', MAX_PHOTO_BYTES + 1) } })
    await expect(service.resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
    expect(fetchFn).toHaveBeenCalledTimes(1) // the body is never downloaded
  })

  it('404 when the bytes exceed the cap although the headers did not say so', async () => {
    const big = Buffer.alloc(MAX_PHOTO_BYTES + 1)
    stubFetch({ body: big, head: { headers: headers('image/jpeg') } })
    await expect(new PhotoService().resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('404 for bytes that are not an image, and for a failed download', async () => {
    stubFetch({ body: Buffer.from('<html>not an image</html>') })
    await expect(new PhotoService().resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(new PhotoService().resize(DOC, 320)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('runs at most two resizes at once', async () => {
    let inFlight = 0
    let peak = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'HEAD') return { ok: true, headers: headers('image/jpeg', jpeg.length) } as Response
        inFlight++
        peak = Math.max(peak, inFlight)
        await new Promise(resolve => setTimeout(resolve, 20))
        inFlight--
        return {
          ok: true,
          headers: headers('image/jpeg'),
          arrayBuffer: () => Promise.resolve(jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.length))
        } as Response
      })
    )
    const service = new PhotoService()
    const all = await Promise.all(Array.from({ length: 6 }, () => service.resize(DOC, 320)))
    expect(all).toHaveLength(6)
    expect(peak).toBe(2)
  })
})
