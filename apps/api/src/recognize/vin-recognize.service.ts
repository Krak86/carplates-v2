import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import { extractVins, type VinRecognizeResponse } from '@carplates/shared'

import { alprLocalEnabled, loadEnv } from '../env.js'
import type { UploadedImage, VinReaderResponse } from './recognize.types.js'

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPSTREAM_TIMEOUT_MS = 15_000
const MAX_CANDIDATES = 5

/**
 * VIN text OCR via the self-hosted container's `/recognize/vin` (RapidOCR, see services/alpr/app.py).
 * The container only returns text lines; finding and ranking 17-char VINs in them is
 * `extractVins` in `@carplates/shared`. No per-lookup cost.
 */
@Injectable()
export class VinRecognizeService {
  private readonly env = loadEnv()

  async recognize(image: UploadedImage): Promise<VinRecognizeResponse> {
    if (!alprLocalEnabled(this.env)) {
      throw new ServiceUnavailableException('Local VIN recognition is not configured')
    }
    if (image.buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (!ACCEPTED_MIME.has(image.mimetype)) {
      throw new BadRequestException(`Unsupported image format "${image.mimetype}" — upload a JPEG, PNG or WebP photo`)
    }

    const form = new FormData()
    form.append('image', new Blob([image.buffer], { type: image.mimetype }), image.filename || 'vin.jpg')

    let payload: VinReaderResponse
    try {
      const res = await fetch(`${this.env.ALPR_LOCAL_URL}/recognize/vin`, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as VinReaderResponse
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new BadGatewayException(`Local VIN OCR request failed: ${(err as Error).message}`)
    }

    const candidates = extractVins(payload.lines ?? []).slice(0, MAX_CANDIDATES)
    if (candidates.length === 0) throw new NotFoundException('No VIN found in the image')
    return { candidates }
  }
}
