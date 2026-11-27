import { BadGatewayException, Injectable, Logger } from '@nestjs/common'
import { z } from 'zod'
import type { SafetyRating, SafetyRatingsResponse } from '@carplates/shared'

import { DEFAULT_JSON_MAX_BYTES, fetchJson } from '../common/fetch-json.js'
import { loadEnv } from '../env.js'
import { nhtsaModelCandidates } from './nhtsa-models.js'

const nhtsaVariantListSchema = z.object({ Results: z.array(z.object({ VehicleId: z.number() })).optional() })
type NhtsaVariant = NonNullable<z.infer<typeof nhtsaVariantListSchema>['Results']>[number]

const nhtsaRatingDetailSchema = z.object({
  VehicleId: z.number(),
  VehicleDescription: z.string(),
  OverallRating: z.string().nullish(),
  OverallFrontCrashRating: z.string().nullish(),
  FrontCrashDriversideRating: z.string().nullish(),
  FrontCrashPassengersideRating: z.string().nullish(),
  FrontCrashPicture: z.string().nullish(),
  FrontCrashVideo: z.string().nullish(),
  OverallSideCrashRating: z.string().nullish(),
  SideCrashDriversideRating: z.string().nullish(),
  SideCrashPassengersideRating: z.string().nullish(),
  SideCrashPicture: z.string().nullish(),
  SideCrashVideo: z.string().nullish(),
  RolloverRating: z.string().nullish(),
  RolloverRating2: z.string().nullish(),
  RolloverPossibility: z.union([z.number(), z.string()]).nullish(),
  RolloverPossibility2: z.union([z.number(), z.string()]).nullish(),
  dynamicTipResult: z.string().nullish(),
  SidePoleCrashRating: z.string().nullish(),
  SidePolePicture: z.string().nullish(),
  SidePoleVideo: z.string().nullish(),
  'combinedSideBarrierAndPoleRating-Front': z.string().nullish(),
  'combinedSideBarrierAndPoleRating-Rear': z.string().nullish(),
  'sideBarrierRating-Overall': z.string().nullish(),
  NHTSAElectronicStabilityControl: z.string().nullish(),
  NHTSAForwardCollisionWarning: z.string().nullish(),
  NHTSALaneDepartureWarning: z.string().nullish(),
  ComplaintsCount: z.number().nullish(),
  RecallsCount: z.number().nullish(),
  InvestigationCount: z.number().nullish()
})
const nhtsaRatingDetailListSchema = z.object({ Results: z.array(nhtsaRatingDetailSchema).optional() })

const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 10_000

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name)
  private readonly base = loadEnv().NHTSA_SAFETY_RATINGS_BASE_URL
  /** A model year's crash ratings never change once published — a bounded map is enough until Redis (Phase 4). */
  private readonly cache = new Map<string, SafetyRatingsResponse>()

  async ratings(make: string, model: string, year: number): Promise<SafetyRatingsResponse> {
    const key = `${year}|${make.toLowerCase()}|${model.toLowerCase()}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const vehicleIds = await this.findVariants(make, model, year)

    const details = await Promise.all(vehicleIds.map(v => this.fetchRating(v.VehicleId)))
    const response: SafetyRatingsResponse = {
      make,
      model,
      year,
      ratings: details.flatMap(r => (r ? [r] : []))
    }

    this.remember(key, response)
    return response
  }

  /**
   * The registry's `model` is often a bare trim-less string ("6", not "Mazda6") or
   * has a trim suffix NHTSA doesn't carry ("3 MPS"). Try the exact value first —
   * cheap and correct for the common case — then a couple of normalized fallbacks
   * only when that comes back empty, stopping at the first real match.
   */
  private async findVariants(make: string, model: string, year: number): Promise<NhtsaVariant[]> {
    for (const candidate of nhtsaModelCandidates(make, model)) {
      const url = `${this.base}/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(candidate)}?format=json`
      const variants = await this.get(url, nhtsaVariantListSchema)
      if (variants.Results && variants.Results.length > 0) return variants.Results
    }
    return []
  }

  private async fetchRating(vehicleId: number): Promise<SafetyRating | undefined> {
    const url = `${this.base}/SafetyRatings/VehicleId/${vehicleId}?format=json`
    const payload = await this.get(url, nhtsaRatingDetailListSchema)
    const raw = payload.Results?.[0]
    if (!raw) return undefined

    return {
      vehicleId: raw.VehicleId,
      description: raw.VehicleDescription,
      overallRating: raw.OverallRating ?? null,
      overallFrontCrashRating: raw.OverallFrontCrashRating ?? null,
      frontCrashDriversideRating: raw.FrontCrashDriversideRating ?? null,
      frontCrashPassengersideRating: raw.FrontCrashPassengersideRating ?? null,
      frontCrashPicture: raw.FrontCrashPicture ?? null,
      frontCrashVideo: raw.FrontCrashVideo ?? null,
      overallSideCrashRating: raw.OverallSideCrashRating ?? null,
      sideCrashDriversideRating: raw.SideCrashDriversideRating ?? null,
      sideCrashPassengersideRating: raw.SideCrashPassengersideRating ?? null,
      sideCrashPicture: raw.SideCrashPicture ?? null,
      sideCrashVideo: raw.SideCrashVideo ?? null,
      rolloverRating: raw.RolloverRating ?? null,
      rolloverRating2: raw.RolloverRating2 ?? null,
      rolloverPossibility: raw.RolloverPossibility != null ? Number(raw.RolloverPossibility) : null,
      rolloverPossibility2: raw.RolloverPossibility2 != null ? Number(raw.RolloverPossibility2) : null,
      dynamicTipResult: raw.dynamicTipResult ?? null,
      sidePoleCrashRating: raw.SidePoleCrashRating ?? null,
      sidePolePicture: raw.SidePolePicture ?? null,
      sidePoleVideo: raw.SidePoleVideo ?? null,
      combinedSideBarrierAndPoleRatingFront: raw['combinedSideBarrierAndPoleRating-Front'] ?? null,
      combinedSideBarrierAndPoleRatingRear: raw['combinedSideBarrierAndPoleRating-Rear'] ?? null,
      sideBarrierRatingOverall: raw['sideBarrierRating-Overall'] ?? null,
      electronicStabilityControl: raw.NHTSAElectronicStabilityControl ?? null,
      forwardCollisionWarning: raw.NHTSAForwardCollisionWarning ?? null,
      laneDepartureWarning: raw.NHTSALaneDepartureWarning ?? null,
      complaintsCount: raw.ComplaintsCount ?? null,
      recallsCount: raw.RecallsCount ?? null,
      investigationCount: raw.InvestigationCount ?? null
    }
  }

  private async get<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
    try {
      return await fetchJson(url, schema, { timeoutMs: UPSTREAM_TIMEOUT_MS, maxBytes: DEFAULT_JSON_MAX_BYTES })
    } catch (err) {
      this.logger.warn(`NHTSA safety ratings request failed: ${(err as Error).message}`)
      throw new BadGatewayException('NHTSA safety ratings request failed')
    }
  }

  private remember(key: string, value: SafetyRatingsResponse): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(key, value)
  }
}
