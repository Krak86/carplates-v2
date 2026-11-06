import { z } from 'zod'

/**
 * Recovery projects from DREAM (dream.gov.ua, the Ukrainian government's recovery management system), read from its public
 * API (Open Contracting Data Standard, no key). Own contract file: online-only, never part of `schemas.ts` / the offline cache.
 * New fields here are `.nullable().optional()`. The data licence is not stated by the API (the government site footer says CC BY 4.0
 * unless noted), so the page always credits DREAM and never calls the numbers official statistics.
 */

/** Base of the upstream API; the only place the URL lives (ingest script imports it). */
export const DREAM_SOURCE_URL = 'https://public-api.dream.gov.ua/marketplace/public/dream'

/** Public site, used for the credit link. */
export const DREAM_SITE_URL = 'https://dream.gov.ua'

/** KATOTTG oblast prefix (first 4 characters of a location code) -> plate-region name (`REGIONS` value). */
export const KATOTTG_OBLAST_REGIONS: Readonly<Record<string, string>> = {
  UA01: 'АР Крим',
  UA05: 'Вінницька область',
  UA07: 'Волинська область',
  UA12: 'Дніпропетровська область',
  UA14: 'Донецька область',
  UA18: 'Житомирська область',
  UA21: 'Закарпатська область',
  UA23: 'Запорізька область',
  UA26: 'Івано-Франківська область',
  UA32: 'Київська область',
  UA35: 'Кіровоградська область',
  UA44: 'Луганська область',
  UA46: 'Львівська область',
  UA48: 'Миколаївська область',
  UA51: 'Одеська область',
  UA53: 'Полтавська область',
  UA56: 'Рівненська область',
  UA59: 'Сумська область',
  UA61: 'Тернопільська область',
  UA63: 'Харківська область',
  UA65: 'Херсонська область',
  UA68: 'Хмельницька область',
  UA71: 'Черкаська область',
  UA73: 'Чернівецька область',
  UA74: 'Чернігівська область',
  UA80: 'Київ',
  UA85: 'Севастополь'
}

/** Plate-region name for a KATOTTG oblast prefix (or a full code), or null when unknown. */
export const regionForKatottg = (code: string | null | undefined): string | null =>
  (code ? KATOTTG_OBLAST_REGIONS[code.slice(0, 4)] : undefined) ?? null

/** `GET /ideas`: ids with their last update (up to 1000 per call; `from` = the last `updated` seen). */
export const dreamListSchema = z.object({
  data: z.array(z.object({ internal: z.object({ id: z.string() }), external: z.object({ updated: z.string() }) }))
})

const financeSchema = z.object({
  status: z.string().nullish(),
  value: z.object({ amount: z.number().nullish(), currency: z.string().nullish() }).nullish()
})

const textSchema = z.array(z.object({ lang: z.string().nullish(), translation: z.string().nullish() }))

/** Only the parts of `GET /ideas/{id}` we use; everything else is ignored so an upstream addition never breaks parsing. */
export const dreamIdeaSchema = z.object({
  internal: z.object({ id: z.string(), code: z.string().nullish(), status: z.string().nullish() }),
  cdu_response: z.object({
    code: z.string().nullish(),
    type: z.string().nullish(),
    purpose: z.string().nullish(),
    status: z.string().nullish(),
    updated: z.string(),
    title: textSchema.nullish(),
    approaches: z
      .array(
        z.object({
          title: z.string().nullish(),
          budget: z.object({ finance: z.array(financeSchema).nullish() }).nullish(),
          items: z
            .array(
              z.object({
                locations: z
                  .array(z.object({ gazetteer: z.object({ identifiers: z.array(z.string()).nullish() }).nullish() }))
                  .nullish()
              })
            )
            .nullish()
        })
      )
      .nullish()
  })
})
export type DreamIdea = z.infer<typeof dreamIdeaSchema>

/** `registry.dream_projects` row shape (without `fetched_at`). */
export type DreamProjectInput = {
  id: string
  code: string
  status: string
  projectType: string | null
  purpose: string | null
  title: string | null
  oblastCode: string | null
  committedUah: number
  updatedAt: Date
}

/** Sum of the finance lines with status `committed` in UAH (indicative and cancelled lines are not funding yet). */
export function committedUah(idea: DreamIdea): number {
  let sum = 0
  for (const approach of idea.cdu_response.approaches ?? []) {
    for (const line of approach.budget?.finance ?? []) {
      if (line.status === 'committed' && line.value?.currency === 'UAH' && typeof line.value.amount === 'number') {
        sum += line.value.amount
      }
    }
  }
  return Math.round(sum * 100) / 100
}

/** First KATOTTG oblast prefix found in the project's locations, or null (a few projects have none). */
export function firstOblastCode(idea: DreamIdea): string | null {
  for (const approach of idea.cdu_response.approaches ?? []) {
    for (const item of approach.items ?? []) {
      for (const location of item.locations ?? []) {
        for (const id of location.gazetteer?.identifiers ?? []) {
          if (/^UA\d{17}$/.test(id)) return id.slice(0, 4)
        }
      }
    }
  }
  return null
}

/** Ukrainian title first, then any other language. */
const pickTitle = (idea: DreamIdea): string | null => {
  const titles = idea.cdu_response.title ?? []
  const best = titles.find(t => t.lang === 'uk' && t.translation) ?? titles.find(t => t.translation)
  return best?.translation ?? null
}

export function ideaToRow(idea: DreamIdea): DreamProjectInput {
  const c = idea.cdu_response
  return {
    id: idea.internal.id,
    code: c.code ?? idea.internal.code ?? idea.internal.id,
    status: c.status ?? 'unknown',
    projectType: c.type ?? null,
    purpose: c.purpose ?? null,
    title: pickTitle(idea),
    oblastCode: firstOblastCode(idea),
    committedUah: committedUah(idea),
    updatedAt: new Date(c.updated)
  }
}

/** Status that is left out of every total (withdrawn or mistaken entries). */
export const DREAM_EXCLUDED_STATUS = 'cancelled'

const countsSchema = z.record(z.string(), z.number().int())

/** `GET /api/dream/summary`: per plate region (and for the country), projects by status and type plus committed funding. */
export const dreamSummaryResponseSchema = z.object({
  /** Newest `updated` among the stored projects (ISO). */
  updatedAt: z.string(),
  total: z.object({
    projects: z.number().int(),
    committedUah: z.number(),
    byStatus: countsSchema,
    byType: countsSchema
  }),
  regions: z.array(
    z.object({
      region: z.string(),
      projects: z.number().int(),
      committedUah: z.number(),
      byStatus: countsSchema,
      byType: countsSchema
    })
  ),
  /** Projects without a usable location (counted in `total`, not in any region). */
  unlocated: z.number().int().nullable().optional()
})
export type DreamSummaryResponse = z.infer<typeof dreamSummaryResponseSchema>
