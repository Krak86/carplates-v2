import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'

import { readUpload, sniffImageMime } from './read-upload.js'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])
const ftyp = (brand: string): Buffer => Buffer.concat([Buffer.alloc(4), Buffer.from(`ftyp${brand}`), Buffer.alloc(8)])

type FakePart = { fieldname: string; mimetype: string; filename: string; toBuffer: () => Promise<Buffer> }
const request = (part: FakePart | undefined): FastifyRequest =>
  ({ file: async () => part }) as unknown as FastifyRequest
const part = (buffer: Buffer, over: Partial<FakePart> = {}): FakePart => ({
  fieldname: 'image',
  mimetype: 'image/jpeg',
  filename: 'photo.jpg',
  toBuffer: async () => buffer,
  ...over
})

describe('sniffImageMime', () => {
  it('recognises JPEG, PNG and WebP by their magic bytes', () => {
    expect(sniffImageMime(JPEG)).toBe('image/jpeg')
    expect(sniffImageMime(PNG)).toBe('image/png')
    expect(sniffImageMime(WEBP)).toBe('image/webp')
  })

  it('rejects text, HTML, SVG and a truncated header', () => {
    for (const text of ['hello', '<html></html>', '<svg xmlns="http://www.w3.org/2000/svg"/>']) {
      expect(sniffImageMime(Buffer.from(text))).toBeNull()
    }
    expect(sniffImageMime(PNG.subarray(0, 5))).toBeNull()
    expect(sniffImageMime(Buffer.alloc(0))).toBeNull()
  })
})

describe('readUpload', () => {
  it('returns the buffer with the sniffed MIME type and no client filename', async () => {
    const upload = await readUpload(request(part(PNG, { mimetype: 'image/jpeg' })))
    expect(upload).toEqual({ buffer: PNG, mimetype: 'image/png' })
  })

  it('rejects a text file renamed .jpg, whatever MIME type the client claims', async () => {
    const req = request(part(Buffer.from('not an image'), { filename: 'evil.jpg', mimetype: 'image/jpeg' }))
    await expect(readUpload(req)).rejects.toBeInstanceOf(BadRequestException)
  })

  it.each([
    ['HEIC/HEIF', ftyp('heic')],
    ['HEIC/HEIF', ftyp('mif1')],
    ['AVIF', ftyp('avif')],
    ['GIF', Buffer.from('GIF89a......')],
    ['BMP', Buffer.from('BM......')],
    ['TIFF', Buffer.from('II*\0....')]
  ])('names %s in the 400 so the user knows what to change', async (name, buffer) => {
    const err = await readUpload(request(part(buffer))).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err as BadRequestException).message).toContain(name)
    expect((err as BadRequestException).message).toContain('JPEG, PNG or WebP')
  })

  it('requires the "image" field and a file', async () => {
    await expect(readUpload(request(part(JPEG, { fieldname: 'file' })))).rejects.toBeInstanceOf(BadRequestException)
    await expect(readUpload(request(undefined))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects an empty file', async () => {
    await expect(readUpload(request(part(Buffer.alloc(0))))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('answers 413 when the multipart size limit is hit', async () => {
    const req = request(
      part(JPEG, {
        toBuffer: async () => {
          throw new Error('request file too large')
        }
      })
    )
    await expect(readUpload(req)).rejects.toBeInstanceOf(PayloadTooLargeException)
  })
})
