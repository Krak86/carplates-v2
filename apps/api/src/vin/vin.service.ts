import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { isVin } from '@carplates/shared'
import type { VinDecodeResponse } from '@carplates/shared'

import { loadEnv } from '../env.js'

interface NhtsaResult {
  Variable?: string
  Value?: string | null
}

const CACHE_MAX = 500

@Injectable()
export class VinService {
  private readonly base = loadEnv().NHTSA_BASE_URL
  /** VIN decodes are immutable — a plain bounded map is enough until Redis (Phase 4). */
  private readonly cache = new Map<string, VinDecodeResponse>()

  async decode(rawVin: string): Promise<VinDecodeResponse> {
    const vin = rawVin.trim().toUpperCase()
    if (!isVin(vin)) {
      throw new BadRequestException(`"${rawVin}" is not a valid 17-character VIN`)
    }

    const cached = this.cache.get(vin)
    if (cached) return cached

    const url = `${this.base}/decodevin/${encodeURIComponent(vin)}?format=json`
    let payload: { Results?: NhtsaResult[] }
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as { Results?: NhtsaResult[] }
    } catch (err) {
      throw new BadGatewayException(`NHTSA decode failed: ${(err as Error).message}`)
    }

    const results = (payload.Results ?? []).flatMap(r =>
      r.Variable && r.Value != null && r.Value !== '' ? [{ variable: r.Variable, value: r.Value }] : []
    )

    if (results.length === 0) {
      throw new NotFoundException(`No decode data for VIN ${vin}`)
    }

    const response: VinDecodeResponse = { vin, results }
    this.remember(vin, response)
    return response
  }

  private remember(vin: string, value: VinDecodeResponse): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(vin, value)
  }
}
