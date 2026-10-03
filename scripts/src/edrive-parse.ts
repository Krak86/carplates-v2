/**
 * Pure helpers for the e-drive.com.ua ingest (edrive.ts): Zod schemas for the few fields of the site's own JSON API
 * (`api.e-drive.com.ua/v1`, what its web app calls) that we use, generation year ranges, and post -> table row.
 */
import { z } from 'zod'

import type { OwnerPostInsert } from '@carplates/db'
import { edriveModelSlug } from '@carplates/shared'

export const EDRIVE_API = 'https://api.e-drive.com.ua/v1'
export const EDRIVE_ORIGIN = 'https://e-drive.com.ua'

export const envelopeSchema = z.object({ success: z.boolean(), data: z.unknown() })

export const makeSchema = z.object({ id: z.number().int(), name: z.string() })
export const modelSchema = z.object({ id: z.number().int(), defaultName: z.string(), name: z.string().nullish() })
export const generationSchema = z.object({
  id: z.number().int(),
  defaultName: z.string(),
  name: z.string().nullish(),
  year: z.object({ name: z.string() })
})
export const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  createdAt: z.string(),
  coverUrl: z.string().nullish(),
  category: z.object({ name: z.string() }).nullish()
})
export const searchSchema = z.object({ posts: z.array(postSchema) })

export type EdriveGeneration = z.infer<typeof generationSchema>
export type EdrivePost = z.infer<typeof postSchema>

/** The display name: the site's own override when set, else its default. */
export const displayName = (x: { defaultName: string; name?: string | null | undefined }): string =>
  x.name?.trim() || x.defaultName

export type GenerationRange = { generation: EdriveGeneration; yearFrom: number | null; yearTo: number | null }

/**
 * A model's generations with their year ranges. The API gives only a start year ("2012"); a generation ends the year
 * before the next one starts (restylings included — they are generations of their own here), the last one is open.
 */
export function generationRanges(generations: EdriveGeneration[]): GenerationRange[] {
  const start = (g: EdriveGeneration): number | null => {
    const year = Number(g.year.name)
    return Number.isInteger(year) && year > 1900 ? year : null
  }
  const dated = generations.map(generation => ({ generation, yearFrom: start(generation) }))
  const starts = [...new Set(dated.flatMap(d => (d.yearFrom === null ? [] : [d.yearFrom])))].sort((a, b) => a - b)
  return dated.map(({ generation, yearFrom }) => {
    const next = yearFrom === null ? undefined : starts.find(s => s > yearFrom)
    return { generation, yearFrom, yearTo: next === undefined ? null : next - 1 }
  })
}

/** `YYYY-MM-DD` of an ISO timestamp, or null. */
const day = (iso: string): string | null => /^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? null

export function postToRow(
  post: EdrivePost,
  brandSlug: string,
  modelName: string,
  range: GenerationRange
): OwnerPostInsert {
  return {
    postId: post.id,
    url: `${EDRIVE_ORIGIN}/post/${post.id}`,
    title: post.title.trim(),
    category: post.category?.name ?? null,
    coverUrl: post.coverUrl ?? null,
    createdAt: day(post.createdAt),
    brandSlug,
    modelSlug: edriveModelSlug(modelName),
    modelName,
    generationName: displayName(range.generation),
    yearFrom: range.yearFrom,
    yearTo: range.yearTo
  }
}
