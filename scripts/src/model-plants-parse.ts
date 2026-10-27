/**
 * Parses the hand-curated `seed-data/model-plants.csv` (ORIGIN_PLAN.md Step 3) into `registry.model_plant` rows.
 *
 * One CSV row = one plant of one model. `models` lists the registry spellings that share the row, separated by `|`
 * ("OCTAVIA|OCTAVIA A5"); each becomes its own `model_slug` (`modelKey`). `country_code` is the modern ISO code (the API client
 * applies `countryAtYear`). `from_year` 0 = unknown start, empty `to_year` = still built there. Every row cites a Wikipedia page.
 */
import type { ModelPlantInsert } from '@carplates/db'
import { modelKey } from '@carplates/shared'
import { z } from 'zod'

export const MODEL_PLANTS_COLUMNS = [
  'brand_slug',
  'models',
  'country_code',
  'city',
  'from_year',
  'to_year',
  'source_url'
] as const

const WIKIPEDIA_URL = /^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/
const yearField = z.string().regex(/^\d{4}$|^0$/)

const rowSchema = z.object({
  brand_slug: z.string().regex(/^[a-z0-9-]+$/),
  models: z.string().min(1),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  city: z.string(),
  from_year: yearField,
  to_year: yearField.or(z.literal('')),
  source_url: z.string().regex(WIKIPEDIA_URL)
})

export type ModelPlantParse = { rows: ModelPlantInsert[]; errors: string[] }

export function parseModelPlants(records: Record<string, string>[]): ModelPlantParse {
  const rows: ModelPlantInsert[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  records.forEach((record, i) => {
    const line = i + 2
    const parsed = rowSchema.safeParse(record)
    if (!parsed.success) {
      errors.push(`line ${line}: ${parsed.error.issues.map(x => `${x.path.join('.')} ${x.message}`).join(', ')}`)
      return
    }
    const r = parsed.data
    const fromYear = Number(r.from_year)
    const toYear = r.to_year ? Number(r.to_year) : null
    if (toYear !== null && toYear < fromYear) {
      errors.push(`line ${line}: to_year ${toYear} before from_year ${fromYear}`)
      return
    }
    for (const model of r.models.split('|')) {
      const slug = modelKey(model)
      if (!slug) {
        errors.push(`line ${line}: model "${model}" has no usable key`)
        continue
      }
      // Spellings that collapse to one key ("RAV4" / "RAV-4") are one model.
      const id = [r.brand_slug, slug, r.country_code, r.city, fromYear].join('|')
      if (seen.has(id)) continue
      seen.add(id)
      rows.push({
        brandSlug: r.brand_slug,
        modelSlug: slug,
        countryCode: r.country_code,
        city: r.city,
        fromYear,
        toYear,
        sourceUrl: r.source_url
      })
    }
  })
  return { rows, errors }
}
