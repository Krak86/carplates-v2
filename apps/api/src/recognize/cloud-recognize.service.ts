import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common'
import type { PlateRecognizeResponse } from '@carplates/shared'

import { loadEnv, plateRecognizerCloudEnabled } from '../env.js'
import { mapPlateReaderResults } from './recognize.mapper.js'
import type { PlateReaderResponse, UploadedImage } from './recognize.types.js'

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPSTREAM_TIMEOUT_MS = 15_000

const currentMonthKey = (): string => new Date().toISOString().slice(0, 7)

@Injectable()
export class CloudRecognizeService {
  private readonly logger = new Logger(CloudRecognizeService.name)
  private readonly env = loadEnv()
  private budget = { month: currentMonthKey(), count: 0 }

  async recognize(image: UploadedImage): Promise<PlateRecognizeResponse> {
    if (!plateRecognizerCloudEnabled(this.env)) {
      throw new ServiceUnavailableException('Plate recognition is not configured')
    }
    this.checkBudget()
    if (image.buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (!ACCEPTED_MIME.has(image.mimetype)) {
      throw new BadRequestException(`Unsupported image format "${image.mimetype}" — upload a JPEG, PNG or WebP photo`)
    }

    const form = new FormData()
    form.append('upload', new Blob([image.buffer], { type: image.mimetype }), image.filename || 'plate.jpg')

    let payload: PlateReaderResponse
    try {
      const res = await fetch(this.env.PLATE_RECOGNIZER_CLOUD_URL, {
        method: 'POST',
        headers: { Authorization: `Token ${this.env.PLATE_RECOGNIZER_CLOUD_TOKEN}`, accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      if (res.status === 401 || res.status === 403) {
        this.logger.error('Plate Recognizer rejected the API token')
        throw new ServiceUnavailableException('Plate recognition is not available')
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException('Plate recognition quota exceeded, try again later')
      }
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as PlateReaderResponse
    } catch (err) {
      if (err instanceof HttpException) throw err // don't let this swallow the mappings above
      throw new BadGatewayException(`Plate Recognizer request failed: ${(err as Error).message}`)
    }

    const candidates = mapPlateReaderResults(payload.results ?? [])
    if (candidates.length === 0) throw new NotFoundException('No plate found in the image')
    return { candidates }
  }

  /**
   * Per-process, resets on the 1st of each month and on restart — good enough
   * for a single Phase-1 instance; revisit with persistence (DB/Redis) once
   * there's more than one API process (Phase 4).
   */
  private checkBudget(): void {
    const month = currentMonthKey()
    if (month !== this.budget.month) this.budget = { month, count: 0 }
    if (this.budget.count >= this.env.PLATE_RECOGNIZER_MONTHLY_BUDGET) {
      throw new ServiceUnavailableException('Plate recognition budget exhausted for this month')
    }
    this.budget.count++
  }
}
