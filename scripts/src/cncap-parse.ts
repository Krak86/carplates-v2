import { z } from 'zod'

import { makeKey, modelKey } from '@carplates/shared'
import type { CncapVehicleClass } from '@carplates/shared'
import type { CncapRatingInsert } from '@carplates/db'

/** Curated `carId -> {make, model}` translation table — see `cncap-names.ts`. */
export type CncapNames = Record<number, { make: string; model: string }>

/**
 * One record from `POST /api/crashSearch` (c-ncap.org.cn's own JSON API — see cncap.ts for the
 * full endpoint shape). Only the fields this parser uses are validated; the live response has
 * several more (`level`, `carImage`, `ruleYear`, ...) that are always null in the real dump and
 * aren't used here.
 */
export const cncapApiRecordSchema = z.object({
  evaluationId: z.string(),
  carId: z.number().int(),
  carName: z.string(),
  score: z.string().nullable(),
  testYear: z.string().nullable(),
  carKind: z.string().nullable(),
  manufacturer: z.string().nullable(),
  targetList: z
    .array(
      z.object({
        targetName: z.string(),
        score: z.string().nullable()
      })
    )
    .nullable()
})
export type CncapApiRecord = z.infer<typeof cncapApiRecordSchema>

/**
 * C-NCAP's own `carKind` values, confirmed exhaustively against the full 601-record dump
 * (2026-09-25) — see `CNCAP_VEHICLE_CLASSES` in `@carplates/shared` for the normalized slugs.
 * A `carKind` not in this map yields `null` rather than guessing, and the caller logs it so a
 * newly-introduced class gets a real translation added here instead of silently dropping.
 */
const VEHICLE_CLASS_BY_ZH: Record<string, CncapVehicleClass> = {
  轿车: 'sedan',
  SUV: 'suv',
  MPV: 'mpv',
  多用途货车: 'van',
  皮卡: 'pickup',
  中大型轿车: 'midLargeSedan',
  中大型: 'midLarge',
  中大型SUV: 'midLargeSuv',
  A级轿车: 'aClassSedan',
  紧凑型轿车: 'compactSedan',
  紧凑型SUV: 'compactSuv',
  中型SUV: 'midSuv',
  小型SUV: 'smallSuv',
  大型SUV: 'largeSuv',
  小型车: 'smallCar',
  A类乘用车: 'classAPassenger',
  B类乘用车: 'classBPassenger',
  'EV/HEV': 'evHev',
  小型乘用车: 'miniPassenger'
}

// C-NCAP's three sub-score categories since the 2018 protocol revision — occupant protection
// existed alone before that (see `parseRecord`'s scoreUnit/points-era branch).
const OCCUPANT_ZH = '乘员保护'
const VRU_ZH = '行人保护\\VRU保护'
const ACTIVE_SAFETY_ZH = '主动安全'

function parseScore(text: string | null): { value: number | null; isPct: boolean } {
  if (!text) return { value: null, isPct: false }
  const isPct = text.endsWith('%')
  const value = Number.parseFloat(text)
  return { value: Number.isNaN(value) ? null : value, isPct }
}

/**
 * Parses one already-validated `crashSearch` API record into a DB row, resolving `make`/`model`
 * from the curated translation table (`cncap-names.ts`) since C-NCAP's own `carName` is
 * Chinese-only. Returns `null` when `carId` has no entry in that table — the caller collects
 * and warns about these rather than the ingest silently dropping them (see cncap.ts).
 */
export function parseRecord(record: CncapApiRecord, names: CncapNames): CncapRatingInsert | null {
  const translated = names[record.carId]
  if (!translated) return null

  const mk = makeKey(translated.make)
  const mdl = modelKey(translated.model)
  if (!mk || !mdl) return null

  const overall = parseScore(record.score)
  const scoreUnit: CncapRatingInsert['scoreUnit'] = overall.isPct ? 'pct' : 'points'

  const targets = record.targetList ?? []
  const scoreFor = (targetNameZh: string): number | null => {
    const target = targets.find(t => t.targetName === targetNameZh)
    return target ? parseScore(target.score).value : null
  }

  // Pre-2018 records have a single 乘员保护 (occupant protection) sub-score and no VRU/active-
  // safety programs yet — that single sub-score is the same figure as the overall score, so it
  // isn't duplicated as a separate lookup; only the post-2018 three-category shape needs one.
  const occupantScore = targets.length > 1 ? scoreFor(OCCUPANT_ZH) : overall.value
  const vruScore = targets.length > 1 ? scoreFor(VRU_ZH) : null
  const activeSafetyScore = targets.length > 1 ? scoreFor(ACTIVE_SAFETY_ZH) : null

  const vehicleClass = record.carKind ? (VEHICLE_CLASS_BY_ZH[record.carKind] ?? null) : null

  return {
    assessmentId: record.evaluationId,
    carId: record.carId,
    make: translated.make,
    model: translated.model,
    makeKey: mk,
    modelKey: mdl,
    nameZh: record.carName,
    manufacturerZh: record.manufacturer,
    vehicleClass,
    ratingYear: record.testYear ? Number.parseInt(record.testYear, 10) : null,
    scoreUnit,
    overallScore: overall.value,
    occupantScore,
    vruScore,
    activeSafetyScore
  }
}
