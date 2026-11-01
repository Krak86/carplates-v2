import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import type { PlateRecognizeResponse } from '@carplates/shared'

import { alprLocalEnabled, loadEnv } from '../env.js'
import { mapPlateReaderResults } from './recognize.mapper.js'
import { RegistryRankService } from './registry-rank.service.js'
import type { PlateReaderResponse, PlateReaderResult, UploadedImage, VinReaderResponse } from './recognize.types.js'

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
// Tiled multi-crop inference on the VPS can take well over 10 s; stays under the 60 s requestTimeout in main.ts.
const UPSTREAM_TIMEOUT_MS = 40_000

/**
 * Own-model ALPR (services/alpr, `pnpm alpr:up`) — self-hosted, no token, no
 * per-lookup budget. Same PlateReaderResponse shape as the cloud service, so
 * it reuses mapPlateReaderResults unchanged. See PLAN.md's "Own ALPR model".
 */
@Injectable()
export class LocalRecognizeService {
  private readonly env = loadEnv()

  constructor(@Inject(RegistryRankService) private readonly registryRank: RegistryRankService) {}

  async recognize(image: UploadedImage): Promise<PlateRecognizeResponse> {
    if (!alprLocalEnabled(this.env)) {
      throw new ServiceUnavailableException('Local plate recognition is not configured')
    }
    if (image.buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (!ACCEPTED_MIME.has(image.mimetype)) {
      throw new BadRequestException(`Unsupported image format "${image.mimetype}" - upload a JPEG, PNG or WebP photo`)
    }

    const form = new FormData()
    form.append('image', new Blob([image.buffer], { type: image.mimetype }), image.filename || 'plate.jpg')

    let payload: PlateReaderResponse
    try {
      const res = await fetch(`${this.env.ALPR_LOCAL_URL}/recognize`, {
        method: 'POST',
        headers: { accept: 'application/json', ...(this.env.ALPR_API_KEY && { 'x-alpr-key': this.env.ALPR_API_KEY }) },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as PlateReaderResponse
    } catch (err) {
      if (err instanceof HttpException) throw err // don't let this swallow the mapping above
      throw new BadGatewayException(`Local ALPR request failed: ${(err as Error).message}`)
    }

    let candidates = mapPlateReaderResults(payload.results ?? [])
    if (candidates.length === 0) candidates = mapPlateReaderResults(await this.readDocumentPlates(form))
    if (candidates.length === 0) throw new NotFoundException('No plate found in the image')
    return { candidates: await this.registryRank.rank(candidates) }
  }

  /**
   * Fallback for a registration certificate (or any printed document): the plate detector finds nothing on a card,
   * so read its text with the VIN route's OCR and offer every plate-shaped token (the mapper drops the rest).
   * Best-effort: a failure here is the same "no plate found" as an empty read.
   */
  private async readDocumentPlates(form: FormData): Promise<PlateReaderResult[]> {
    try {
      const res = await fetch(`${this.env.ALPR_LOCAL_URL}/recognize/vin`, {
        method: 'POST',
        headers: { accept: 'application/json', ...(this.env.ALPR_API_KEY && { 'x-alpr-key': this.env.ALPR_API_KEY }) },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (!res.ok) return []
      const { lines = [] } = (await res.json()) as VinReaderResponse
      return lines.flatMap(({ text, score, box }) =>
        text
          .split(/\s+/)
          .filter(Boolean)
          .map(plate => ({ plate, score, ...(box && { box }) }))
      )
    } catch {
      return []
    }
  }
}
