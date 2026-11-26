import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import { extractVins, type VinRecognizeResponse } from '@carplates/shared'

import { alprLocalEnabled, loadEnv } from '../env.js'
import { ACCEPTED_MIME, UNSUPPORTED_IMAGE_MESSAGE } from './read-upload.js'
import type { UploadedImage, VinReaderResponse } from './recognize.types.js'

const UPSTREAM_TIMEOUT_MS = 40_000
const MAX_CANDIDATES = 5

/**
 * VIN text OCR via the self-hosted container's `/recognize/vin` (RapidOCR, see services/alpr/app.py).
 * The container only returns text lines; finding and ranking 17-char VINs in them is
 * `extractVins` in `@carplates/shared`. No per-lookup cost.
 */
@Injectable()
export class VinRecognizeService {
  private readonly logger = new Logger(VinRecognizeService.name)
  private readonly env = loadEnv()

  async recognize(image: UploadedImage): Promise<VinRecognizeResponse> {
    if (!alprLocalEnabled(this.env)) {
      throw new ServiceUnavailableException('Local VIN recognition is not configured')
    }
    if (image.buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (!ACCEPTED_MIME.has(image.mimetype)) {
      throw new BadRequestException(UNSUPPORTED_IMAGE_MESSAGE)
    }

    const form = new FormData()
    form.append('image', new Blob([image.buffer], { type: image.mimetype }), 'vin')

    let payload: VinReaderResponse
    try {
      const res = await fetch(`${this.env.ALPR_LOCAL_URL}/recognize/vin`, {
        method: 'POST',
        headers: { accept: 'application/json', ...(this.env.ALPR_API_KEY && { 'x-alpr-key': this.env.ALPR_API_KEY }) },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as VinReaderResponse
    } catch (err) {
      if (err instanceof HttpException) throw err
      this.logger.warn(`Local VIN OCR request failed: ${(err as Error).message}`)
      throw new BadGatewayException('VIN recognition request failed')
    }

    const candidates = extractVins(payload.lines ?? []).slice(0, MAX_CANDIDATES)
    if (candidates.length === 0) throw new NotFoundException('No VIN found in the image')
    return { candidates }
  }
}
