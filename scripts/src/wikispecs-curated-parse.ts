/**
 * Hand-curated spec rows (`wikispecs-curated.csv`) → `model_generations` + `model_spec_wiki` rows. Policy (K-M7 step 5): the
 * figures are facts read from ONE manufacturer page per row (cited by URL + access date, nothing copied verbatim), never a
 * scraped third-party catalogue; a row with fewer than `MIN_FIGURES` sourced figures is dropped; an unsourced figure stays empty.
 */
import type { ModelGenerationInsert, ModelSpecWikiInsert, WikiEngineJson } from '@carplates/db'
import { CURATED_LANG, CURATED_YEAR_FROM } from '@carplates/shared'

export const MIN_FIGURES = 3
const PS_TO_KW = 0.7354875
const FUELS = ['petrol', 'diesel', 'electric', 'hybrid', 'lpg'] as const

export type CuratedRow = ModelGenerationInsert & { spec: ModelSpecWikiInsert }
export type CuratedResult = { rows: CuratedRow[]; dropped: { key: string; reason: string }[] }

const num = (s: string | undefined): number | null => {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Rounds to one decimal: 12 PS → 8.8 kW. */
const psToKw = (ps: number): number => Math.round(ps * PS_TO_KW * 10) / 10

export function parseCurated(records: Record<string, string>[]): CuratedResult {
  const rows: CuratedRow[] = []
  const dropped: CuratedResult['dropped'] = []
  const seen = new Set<string>()
  for (const r of records) {
    const makeKey = (r.make_key ?? '').trim()
    const modelKey = (r.model_key ?? '').trim()
    const key = `${makeKey}|${modelKey}`
    const drop = (reason: string): void => void dropped.push({ key, reason })
    if (!makeKey || !modelKey || !r.make?.trim() || !r.model?.trim()) {
      drop('missing make / model')
      continue
    }
    if (seen.has(key)) {
      drop('duplicate key')
      continue
    }

    const sourceUrl = (r.source_url ?? '').trim()
    const accessed = (r.accessed ?? '').trim()
    if (!/^https:\/\/\S+$/.test(sourceUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(accessed) || !r.source_label?.trim()) {
      drop('needs source_label, an https source_url and an ISO accessed date')
      continue
    }

    const displacementCc = num(r.displacement_cc)
    const cylinders = num(r.cylinders)
    const powerPs = num(r.power_ps)
    const dims = {
      wheelbaseMm: num(r.wheelbase_mm),
      lengthMm: num(r.length_mm),
      widthMm: num(r.width_mm),
      heightMm: num(r.height_mm),
      kerbKg: num(r.kerb_kg),
      fuelTankL: num(r.fuel_tank_l)
    }
    const figures = [displacementCc, powerPs, ...Object.values(dims)].filter(v => v !== null).length
    if (figures < MIN_FIGURES) {
      drop(`${figures} sourced figure(s), need ${MIN_FIGURES}`)
      continue
    }

    const fuelText = (r.fuel ?? '').trim()
    const fuel = FUELS.find(f => f === fuelText) ?? null
    if (fuelText && !fuel) {
      drop(`unknown fuel "${fuelText}"`)
      continue
    }

    const engine: WikiEngineJson | null =
      displacementCc !== null || powerPs !== null
        ? { displacementCc, cylinders, powerKw: powerPs !== null ? psToKw(powerPs) : null, fuel, raw: '' }
        : null
    const hasDims = Object.values(dims).some(v => v !== null)
    seen.add(key)
    rows.push({
      makeKey,
      modelKey,
      make: r.make.trim(),
      model: r.model.trim(),
      yearFrom: CURATED_YEAR_FROM,
      yearTo: null,
      code: '',
      label: '',
      bodyStyles: '',
      platform: '',
      wikiTitle: '',
      wikidataId: '',
      source: 'curated',
      spec: {
        makeKey,
        modelKey,
        yearFrom: CURATED_YEAR_FROM,
        ...dims,
        engines: engine ? [engine] : [],
        srcLang: hasDims ? CURATED_LANG : '',
        srcTitle: '',
        enginesLang: engine ? CURATED_LANG : '',
        enginesTitle: '',
        sourceLabel: r.source_label.trim(),
        sourceUrl,
        sourceAccessed: accessed
      }
    })
  }
  return { rows, dropped }
}
