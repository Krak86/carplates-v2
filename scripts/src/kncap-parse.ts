import { z } from 'zod'

import { makeKey, modelKey } from '@carplates/shared'
import type { KncapRatingInsert } from '@carplates/db'

/** Curated `idx -> {make, model}` translation table — see `kncap-names.ts`. */
export type KncapNames = Record<number, { make: string; model: string }>

const BASE_URL = 'https://www.kncap.org'

/**
 * One record from `POST /ncs/KncapResult/selectInitList.json` (kncap.org's own JSON results
 * catalog — see kncap.ts for the full endpoint shape). Only the fields this parser uses are
 * validated; the live response has a few more (`FILE_IMG`, `FILE_NAME`, `EXTRA_SUM`, ...) that
 * are always null/unused in the real dump.
 */
export const kncapApiRecordSchema = z.object({
  IDX: z.number().int(),
  YEAR: z.string(),
  CAR_TITLE: z.string(),
  COMPANY_NAME: z.string(),
  BRAND_NAME: z.string(),
  OVERALL_SCORE: z.string().nullable(),
  OVERALL_CLASS: z.string().nullable(),
  CRASH_PCT: z.string().nullable(),
  CRASH_STAR: z.number().int().nullable(),
  PEDESTRIAN_PCT: z.string().nullable(),
  PEDESTRIAN_STAR: z.number().int().nullable(),
  ACCIDENT_PCT: z.string().nullable(),
  ACCIDENT_STAR: z.number().int().nullable(),
  IMAGE_R_NAME: z.string().nullable(),
  CAR_IMAGE_R_NAME: z.string().nullable()
})
export type KncapApiRecord = z.infer<typeof kncapApiRecordSchema>

function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null
  const value = Number.parseFloat(text)
  return Number.isNaN(value) ? null : value
}

function parseInt5(text: string | null | undefined): number | null {
  const value = parseNumber(text)
  return value == null ? null : Math.round(value)
}

function imageUrl(record: KncapApiRecord): string | null {
  const path = record.IMAGE_R_NAME ?? record.CAR_IMAGE_R_NAME
  return path ? `${BASE_URL}/fileupload/${path}` : null
}

/**
 * Parses one already-validated `selectInitList` API record into a DB row, resolving
 * `make`/`model` from the curated translation table (`kncap-names.ts`) since KNCAP's own
 * `COMPANY_NAME`/`BRAND_NAME` are Korean-only. Returns `null` when `IDX` has no entry in that
 * table — the caller collects and warns about these rather than the ingest silently dropping
 * them (see kncap.ts). This is also how the one known junk/test row in production
 * (IDX 492, `COMPANY_NAME: "테스트"`) gets filtered out: it simply never gets a translation-
 * table entry, not a special-cased check.
 */
export function parseRecord(record: KncapApiRecord, names: KncapNames): KncapRatingInsert | null {
  const translated = names[record.IDX]
  if (!translated) return null

  const mk = makeKey(translated.make)
  const mdl = modelKey(translated.model)
  if (!mk || !mdl) return null

  return {
    assessmentId: String(record.IDX),
    idx: record.IDX,
    make: translated.make,
    model: translated.model,
    makeKey: mk,
    modelKey: mdl,
    nameKo: record.CAR_TITLE,
    ratingYear: Number.parseInt(record.YEAR, 10),
    overallScore: parseNumber(record.OVERALL_SCORE),
    overallClass: parseInt5(record.OVERALL_CLASS),
    crashPct: parseNumber(record.CRASH_PCT),
    crashStar: record.CRASH_STAR,
    pedestrianPct: parseNumber(record.PEDESTRIAN_PCT),
    pedestrianStar: record.PEDESTRIAN_STAR,
    accidentPct: parseNumber(record.ACCIDENT_PCT),
    accidentStar: record.ACCIDENT_STAR,
    imageUrl: imageUrl(record)
  }
}
