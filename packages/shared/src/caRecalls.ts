import { z } from 'zod'

/**
 * One Canadian safety recall from Transport Canada's Vehicle Recalls Database (Open Government Licence - Canada), kept only
 * when no US (NHTSA) campaign looks like the same recall. The text is Transport Canada's own English wording ("Issue: …
 * Safety Risk: … Corrective Actions: …"). A campaign covers the Canadian-market vehicles built to that spec: it says nothing
 * about whether a particular car (least of all a Ukrainian one) is affected.
 */
/** Machine translation of a campaign's text into one language (`uk`, `ru`), headings localized, layout kept. */
export const caRecallTranslationSchema = z.object({
  text: z.string(),
  engine: z.string()
})

export const caRecallSchema = z.object({
  /** Transport Canada recall number (2019090). */
  code: z.string(),
  /** ISO date of the recall, if recorded. */
  publishedAt: z.string().nullable(),
  /** TC's notification type: `Safety Mfr`, `Safety TC`, `Service Campaign Mfr`. */
  notification: z.string().nullable(),
  /** Vehicle category ("Car", "SUV", "Light Truck & Van"). */
  category: z.string().nullable(),
  /** Affected system ("Brakes", "Airbag", "Engine"). */
  system: z.string().nullable(),
  /** The manufacturer's own campaign number. */
  manufacturerNo: z.string().nullable(),
  text: z.string().nullable(),
  /** Vehicles in the campaign (Canada), as reported. */
  units: z.number().int().nullable(),
  /** Model years of the matched model the campaign covers (empty = not recorded). */
  years: z.array(z.number().int()),
  /** Machine translations of `text` by language code, only where every section has one. Optional for old caches. */
  translations: z.record(z.string(), caRecallTranslationSchema).optional()
})
export type CaRecall = z.infer<typeof caRecallSchema>

export type CaTextSection = {
  /** Heading as Transport Canada wrote it ("Issue", "Safety Risk"); null for text before the first heading. */
  label: string | null
  body: string
}

/** "Issue:\n…\n\nSafety Risk:\n…" → sections; a text without headings is one section with no label. */
export function splitCaText(text: string): CaTextSection[] {
  const sections: CaTextSection[] = []
  let label: string | null = null
  let lines: string[] = []
  const flush = (): void => {
    const body = lines.join(' ').replace(/\s+/g, ' ').trim()
    if (body || label) sections.push({ label, body })
    lines = []
  }
  for (const line of text.split(/\r?\n/)) {
    const heading = /^([A-Z][A-Za-z ]{2,30}):\s*$/.exec(line.trim())
    if (heading) {
      flush()
      label = heading[1]!
    } else lines.push(line)
  }
  flush()
  return sections.filter(s => s.body)
}

type CaHeadingKind = 'issue' | 'risk' | 'actions'

const CA_HEADING_KINDS: readonly [RegExp, CaHeadingKind][] = [
  [/^issue$/i, 'issue'],
  [/^safety risks?$/i, 'risk'],
  [/^(corrective (actions?|measures)|correction)$/i, 'actions']
]

const CA_HEADINGS: Readonly<Record<string, Record<CaHeadingKind, string>>> = {
  uk: { issue: 'Проблема', risk: 'Ризик для безпеки', actions: 'Коригувальні дії' },
  ru: { issue: 'Проблема', risk: 'Риск для безопасности', actions: 'Корректирующие действия' }
}

/** Heading in `lang` ("Safety Risk" → "Ризик для безпеки"); the original wording for an unknown heading or language. */
export function caHeading(label: string, lang: string): string {
  const kind = CA_HEADING_KINDS.find(([re]) => re.test(label.trim()))?.[1]
  return (kind && CA_HEADINGS[lang]?.[kind]) || label
}

/** Sections back into text, headings localized to `lang`: "Проблема:\n…\n\nРизик для безпеки:\n…". */
export function joinCaText(sections: CaTextSection[], lang: string): string {
  return sections.map(s => (s.label ? `${caHeading(s.label, lang)}:\n${s.body}` : s.body)).join('\n\n')
}

/**
 * GET /api/ca/recalls — Canadian recall campaigns without a US twin for a registry make/model (and model year when given).
 * Persisted reference data (`pnpm ingest:ca-recalls`). Own file, not `schemas.ts`, so it does not bust users' offline caches.
 */
export const caRecallsResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      /** All campaigns found; `recalls` holds the newest `CA_RECALLS_LIMIT` of them. */
      total: z.number().int(),
      recalls: z.array(caRecallSchema)
    })
    .nullable()
})
export type CaRecallsResponse = z.infer<typeof caRecallsResponseSchema>

/** How many campaigns the API sends per model (newest first); the count above it is still reported. */
export const CA_RECALLS_LIMIT = 30
