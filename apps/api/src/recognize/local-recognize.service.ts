import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import type { PlateRecognizeResponse } from '@carplates/shared'

import { alprLocalEnabled, loadEnv } from '../env.js'
import { mapPlateReaderResults } from './recognize.mapper.js'
import type { PlateReaderResponse, UploadedImage } from './recognize.types.js'

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPSTREAM_TIMEOUT_MS = 10_000

/**
 * Own-model ALPR (services/alpr, `pnpm alpr:up`) — self-hosted, no token, no
 * per-lookup budget. Same PlateReaderResponse shape as the cloud service, so
 * it reuses mapPlateReaderResults unchanged. See PLAN.md's "Own ALPR model".
 */
@Injectable()
export class LocalRecognizeService {
  private readonly env = loadEnv()

  async recognize(image: UploadedImage): Promise<PlateRecognizeResponse> {
    if (!alprLocalEnabled(this.env)) {
      throw new ServiceUnavailableException('Local plate recognition is not configured')
    }
    if (image.buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (!ACCEPTED_MIME.has(image.mimetype)) {
      throw new BadRequestException(`Unsupported image format "${image.mimetype}" — upload a JPEG, PNG or WebP photo`)
    }

    const form = new FormData()
    form.append('image', new Blob([image.buffer], { type: image.mimetype }), image.filename || 'plate.jpg')

    let payload: PlateReaderResponse
    try {
      const res = await fetch(`${this.env.ALPR_LOCAL_URL}/recognize`, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as PlateReaderResponse
    } catch (err) {
      if (err instanceof HttpException) throw err // don't let this swallow the mapping above
      throw new BadGatewayException(`Local ALPR request failed: ${(err as Error).message}`)
    }

    const candidates = mapPlateReaderResults(payload.results ?? [])
    if (candidates.length === 0) throw new NotFoundException('No plate found in the image')
    return { candidates }
  }
}
