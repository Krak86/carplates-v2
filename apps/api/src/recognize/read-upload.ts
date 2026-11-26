import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

import { sniffShareFormat } from '../shares/helpers.js'
import type { UploadedImage } from './recognize.types.js'

export const UPLOAD_FIELD = 'image'
export const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
/** Shown to the user as-is (the web maps a 400 to its own localized text), so it names what is accepted. */
export const UNSUPPORTED_IMAGE_MESSAGE = 'Unsupported image format - upload a JPEG, PNG or WebP photo'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** MIME type from the magic bytes (the client-sent type and filename are never trusted); `null` = not JPEG/PNG/WebP. */
export function sniffImageMime(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length >= PNG_SIGNATURE.length && buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return 'image/png'
  }
  const shared = sniffShareFormat(buf)
  return shared ? `image/${shared}` : null
}

/** Phone formats the browser could not convert: named in the 400 so the cause is clear (HEIC from an iPhone, AVIF, GIF). */
function rejectedFormat(buf: Buffer): string | null {
  if (buf.length >= 12 && buf.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buf.toString('latin1', 8, 12)
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return 'HEIC/HEIF'
    if (brand === 'avif' || brand === 'avis') return 'AVIF'
  }
  if (buf.length >= 6 && ['GIF87a', 'GIF89a'].includes(buf.toString('latin1', 0, 6))) return 'GIF'
  if (buf.length >= 2 && buf.toString('latin1', 0, 2) === 'BM') return 'BMP'
  if (buf.length >= 4 && ['II*\0', 'MM\0*'].includes(buf.toString('latin1', 0, 4))) return 'TIFF'
  return null
}

/** The single `image` file of a multipart request (the size limit is `@fastify/multipart`'s, set in main.ts). */
export async function readUpload(req: FastifyRequest): Promise<UploadedImage> {
  const part = await req.file()
  if (!part || part.fieldname !== UPLOAD_FIELD) {
    throw new BadRequestException(`Expected a multipart form with an "${UPLOAD_FIELD}" file field`)
  }
  let buffer: Buffer
  try {
    buffer = await part.toBuffer()
  } catch {
    throw new PayloadTooLargeException('Image is too large')
  }
  if (buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
  const mimetype = sniffImageMime(buffer)
  if (!mimetype) {
    const format = rejectedFormat(buffer)
    throw new BadRequestException(
      format ? `${format} images are not supported - upload a JPEG, PNG or WebP photo` : UNSUPPORTED_IMAGE_MESSAGE
    )
  }
  return { buffer, mimetype }
}
