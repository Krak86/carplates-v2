import { BadGatewayException, Injectable } from '@nestjs/common'
import type { SafetyRating, SafetyRatingsResponse } from '@carplates/shared'

import { loadEnv } from '../env.js'

interface NhtsaVariant {
  VehicleId: number
}

interface NhtsaVariantList {
  Results?: NhtsaVariant[]
}

interface NhtsaRatingDetail {
  VehicleId: number
  VehicleDescription: string
  OverallRating?: string | null
  OverallFrontCrashRating?: string | null
  FrontCrashDriversideRating?: string | null
  FrontCrashPassengersideRating?: string | null
  FrontCrashPicture?: string | null
  FrontCrashVideo?: string | null
  OverallSideCrashRating?: string | null
  SideCrashDriversideRating?: string | null
  SideCrashPassengersideRating?: string | null
  SideCrashPicture?: string | null
  SideCrashVideo?: string | null
  RolloverRating?: string | null
  RolloverRating2?: string | null
  RolloverPossibility?: number | string | null
  RolloverPossibility2?: number | string | null
  dynamicTipResult?: string | null
  SidePoleCrashRating?: string | null
  SidePolePicture?: string | null
  SidePoleVideo?: string | null
  'combinedSideBarrierAndPoleRating-Front'?: string | null
  'combinedSideBarrierAndPoleRating-Rear'?: string | null
  'sideBarrierRating-Overall'?: string | null
  NHTSAElectronicStabilityControl?: string | null
  NHTSAForwardCollisionWarning?: string | null
  NHTSALaneDepartureWarning?: string | null
  ComplaintsCount?: number | null
  RecallsCount?: number | null
  InvestigationCount?: number | null
}

interface NhtsaRatingDetailList {
  Results?: NhtsaRatingDetail[]
}

const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 10_000

// Mazda's own model names are "Mazda2"/"Mazda3"/"Mazda5"/"Mazda6" — NHTSA indexes
// them that way, but the Ukrainian registry (and a bare VIN decode) gives just the
// digit ("6"), so an exact match against NHTSA always misses without this.
const MAZDA_NUMERIC_MODELS = new Set(['2', '3', '5', '6'])

// Mercedes-Benz's registry model is a trim code ("E 200", "ML 350"), but NHTSA indexes
// by class ("E-CLASS", "ML-CLASS") — same root mismatch as Euro NCAP's, see
// euroncap.service.ts's brandCandidateKey, but NHTSA needs no legacy-rename table: it
// keeps the badge each model year actually shipped under (still "ML-CLASS" for the years
// that badge was current), which already matches the registry's own leading letters
// verbatim — just reformatted as "<LETTERS>-CLASS".
const MERCEDES_BENZ_MAKE = 'mercedes-benz'

@Injectable()
export class SafetyService {
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
    for (const candidate of this.candidateModels(make, model)) {
      const url = `${this.base}/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(candidate)}?format=json`
      const variants = await this.get<NhtsaVariantList>(url)
      if (variants.Results && variants.Results.length > 0) return variants.Results
    }
    return []
  }

  private candidateModels(make: string, model: string): string[] {
    const trimmed = model.trim()
    const firstToken = trimmed.split(/\s+/)[0] ?? trimmed
    const candidates = [trimmed]
    const normalizedMake = make.trim().toLowerCase()

    if (normalizedMake === 'mazda' && MAZDA_NUMERIC_MODELS.has(firstToken)) {
      candidates.push(`Mazda${firstToken}`)
    }
    // Only when there's an actual "<letters> <digits...>" split — a one-word model
    // ("SPRINTER", "VITO") has no class letters to extract, so leave it alone.
    if (normalizedMake === MERCEDES_BENZ_MAKE && firstToken !== trimmed) {
      candidates.push(`${firstToken.toUpperCase()}-CLASS`)
    }
    if (firstToken !== trimmed) candidates.push(firstToken)

    return [...new Set(candidates)]
  }

  private async fetchRating(vehicleId: number): Promise<SafetyRating | undefined> {
    const url = `${this.base}/SafetyRatings/VehicleId/${vehicleId}?format=json`
    const payload = await this.get<NhtsaRatingDetailList>(url)
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

  private async get<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return (await res.json()) as T
    } catch (err) {
      throw new BadGatewayException(`NHTSA safety ratings request failed: ${(err as Error).message}`)
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
