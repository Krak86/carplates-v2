import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PROZORRO_DOC_ID_RE, prozorroDocumentUrl } from '@carplates/shared'
import sharp from 'sharp'

import { PHOTO_WIDTHS } from './photo.schema.js'

/** Largest original accepted (the measured maximum on Prozorro is 7.3 MB, p90 5.8 MB). */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 30_000
/** Decompression-bomb guard: a 100 MP original is far above any phone photo. */
const MAX_INPUT_PIXELS = 100_000_000
/** Resizes in flight at once (libvips is fast, the VPS is small). The rest wait their turn. */
const MAX_CONCURRENT = 2
const WEBP_QUALITY = 75

/**
 * Resizes a Prozorro.Sale auction photo to WebP. The original lives at `procedure.prozorro.sale/api/documents/public/<docId>`
 * (content-addressed, public, no resize parameter); the edge keeps each variant for a year, so the VPS resizes a photo once.
 * Every failure is a 404: the web falls back to the original URL (and hides the image when that fails too).
 */
@Injectable()
export class PhotoService {
  private active = 0
  private readonly waiting: (() => void)[] = []

  private async slot<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= MAX_CONCURRENT) await new Promise<void>(resolve => this.waiting.push(resolve))
    this.active++
    try {
      return await work()
    } finally {
      this.active--
      this.waiting.shift()?.()
    }
  }

  /** The original's bytes, or a 404 for a missing, non-image or oversize document. */
  private async download(docId: string): Promise<Buffer> {
    const url = prozorroDocumentUrl(docId)
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    const type = head.headers.get('content-type') ?? ''
    const size = Number(head.headers.get('content-length') ?? 0)
    if (!head.ok || !type.startsWith('image/') || size > MAX_PHOTO_BYTES)
      throw new NotFoundException('photo not available')

    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
      throw new NotFoundException('photo not available')
    }
    // The header can lie (or be absent on a chunked answer): the cap is checked on the bytes too.
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new NotFoundException('photo not available')
    return bytes
  }

  async resize(docId: string, width: number): Promise<Buffer> {
    if (!PROZORRO_DOC_ID_RE.test(docId)) throw new BadRequestException('invalid document id')
    if (!(PHOTO_WIDTHS as readonly number[]).includes(width)) throw new BadRequestException('unsupported width')

    return this.slot(async () => {
      let original: Buffer
      try {
        original = await this.download(docId)
      } catch (err) {
        if (err instanceof NotFoundException) throw err
        throw new NotFoundException('photo not available') // timeout, DNS, reset
      }
      try {
        return await sharp(original, { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
      } catch {
        throw new NotFoundException('photo not available') // not a decodable image
      }
    })
  }
}
