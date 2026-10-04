import { z } from 'zod'

/** One Sketchfab search hit, trimmed to what we keep. */
export type SketchfabModel = {
  uid: string
  name: string
  year: number | null
  authorName: string
  authorUrl: string
  thumbUrl: string | null
  viewCount: number
  likeCount: number
  license: string | null
  publishedAt: string | null
}

const searchSchema = z.object({
  results: z.array(
    z.object({
      uid: z.string(),
      name: z.string(),
      viewCount: z.number().optional(),
      likeCount: z.number().optional(),
      publishedAt: z.string().nullish(),
      isAgeRestricted: z.boolean().optional(),
      thumbnails: z.object({ images: z.array(z.object({ url: z.string(), width: z.number() })) }).optional(),
      user: z.object({ displayName: z.string().nullish(), username: z.string(), profileUrl: z.string() }),
      license: z.object({ label: z.string() }).nullish()
    })
  ),
  next: z.string().nullish()
})

/** Words of `text`, lowercase alphanumerics (`Cee'd` -> `ceed`, `Kia-Ceed` -> `kia`, `ceed`). */
export const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** The first plausible model year (1950-2039) in a title, or null. */
export function parseTitleYear(title: string): number | null {
  const m = /\b(19[5-9]\d|20[0-3]\d)\b/.exec(title)
  return m ? Number(m[1]) : null
}

/** Our brand slugs (infocar spelling) that Sketchfab titles spell differently. */
const BRAND_NAMES: Readonly<Record<string, string[]>> = {
  vaz: ['lada', 'vaz'],
  'ssang-yong': ['ssangyong', 'ssang-yong'],
  'alfa-romeo': ['alfa-romeo', 'alfa']
}

/** The spellings of a brand slug to look for in a title (the slug itself unless aliased). */
export const brandNames = (brandSlug: string): string[] => BRAND_NAMES[brandSlug] ?? [brandSlug]

/**
 * Does a model's title name this make and model? Search is fuzzy and returns neighbours (other models of the brand,
 * props, "NPC vehicle packs"), so every word of the brand and of the model must be a word of the TITLE — tags are not
 * trusted, they are what let a game asset pack through. `Cee'd` also matches `Ceed`; `Grand Cherokee` needs both words.
 */
export function titleMatches(title: string, brandSlug: string, modelName: string): boolean {
  const have = new Set(words(title))
  const model = words(modelName)
  const brandOk = brandNames(brandSlug).some(b => words(b).every(w => have.has(w)))
  return brandOk && model.length > 0 && model.every(w => have.has(w))
}

const THUMB_WIDTH = 720

function pickThumb(images: { url: string; width: number }[] | undefined): string | null {
  if (!images?.length) return null
  // closest to the width the modal list needs, preferring the smaller of two equally-near ones
  const best = [...images].sort((a, b) => Math.abs(a.width - THUMB_WIDTH) - Math.abs(b.width - THUMB_WIDTH))[0]
  return best?.url ?? null
}

/** Parses a `/v3/search?type=models` response into the hits that really are this make/model. */
export function parseSearch(json: unknown, brandSlug: string, modelName: string): SketchfabModel[] {
  const parsed = searchSchema.parse(json)
  return parsed.results
    .filter(r => !r.isAgeRestricted && titleMatches(r.name, brandSlug, modelName))
    .map(r => ({
      uid: r.uid,
      name: r.name,
      year: parseTitleYear(r.name),
      authorName: r.user.displayName || r.user.username,
      authorUrl: r.user.profileUrl,
      thumbUrl: pickThumb(r.thumbnails?.images),
      viewCount: r.viewCount ?? 0,
      likeCount: r.likeCount ?? 0,
      license: r.license?.label ?? null,
      publishedAt: r.publishedAt ? r.publishedAt.slice(0, 10) : null
    }))
}
