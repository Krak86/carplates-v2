import { infocarBrandSlug, modelSlugCandidates } from './infocarLookup.js'
import type { InfocarRow } from './infocarLookup.js'

/**
 * Picks infocar.ua videos (`registry.car_videos`, see scripts/src/infocar-videos.ts) for a registry (brand, model, year).
 * Pure over the rows it is given. A video matches when its model slug is one of the model's candidate slugs
 * (`infocarLookup`'s matching) or a variant of one (`passat-variant` for PASSAT, `superb-combi` for SUPERB). Brand-only
 * videos (no model slug) never match a model.
 *
 * Year: a video carries infocar's generation id (the `_id7347` of its page, the same id as the catalog version page
 * `test_rav4_id7347.html`), so with the catalog rows its generation's year range is known — a 2017 RAV4 then gets the
 * 2015–2018 generation's videos, not the 2026 ones. A video whose generation isn't in the catalog falls back to the
 * year its title names (dropped when that is far from the car's year; kept when it names none). Best first: videos of
 * the car's own generation, then the rest, each newest first. Without a car year nothing is filtered.
 */
export type InfocarVideoRow = {
  youtubeId: string
  title: string
  thumbUrl: string | null
  durationS: number | null
  /** `YYYY-MM-DD`. */
  publishedAt: string | null
  brandSlug: string
  modelSlug: string | null
  /** infocar generation id; null when the video isn't tagged with one. */
  generationId: number | null
  /** A model year named in the title. */
  year: number | null
  url: string
}

export const MAX_VIDEOS = 6

/** How far a title's year may be from the car's year (generation unknown) before the video is dropped. */
const TITLE_YEAR_TOLERANCE = 3

type YearRange = { from: number; to: number }

/** Generation id (`..._id7347.html`) -> its year range, from the catalog's version rows. */
function generationRanges(catalog: InfocarRow[], currentYear: number): Map<number, YearRange> {
  const out = new Map<number, YearRange>()
  for (const row of catalog) {
    const id = Number(/_id(\d+)\.html$/.exec(row.url)?.[1])
    if (row.versionName === null || !id || row.yearFrom === null) continue
    out.set(id, { from: row.yearFrom, to: row.yearTo ?? currentYear })
  }
  return out
}

export function videoLookup(
  rows: InfocarVideoRow[],
  catalog: InfocarRow[],
  brand: string | null | undefined,
  model: string | null | undefined,
  year: number | null | undefined,
  currentYear: number = new Date().getFullYear()
): InfocarVideoRow[] {
  const slug = infocarBrandSlug(brand)
  if (!slug || !model?.trim()) return []
  const brandRows = rows.filter(r => r.brandSlug === slug && r.modelSlug)
  const videoSlugs = [...new Set(brandRows.map(r => r.modelSlug!))]
  const ranges = generationRanges(catalog, currentYear)

  // Tier 0 = the video's generation covers the car's year, 1 = generation unknown but the title doesn't contradict
  // the year, null = drop.
  const tier = (r: InfocarVideoRow): 0 | 1 | null => {
    if (year == null) return 1
    const range = r.generationId === null ? undefined : ranges.get(r.generationId)
    if (range) return range.from <= year && year <= range.to ? 0 : null
    return r.year === null || Math.abs(r.year - year) <= TITLE_YEAR_TOLERANCE ? 1 : null
  }

  // The first candidate that has any video wins (candidates run most specific first).
  for (const candidate of modelSlugCandidates(slug, model, videoSlugs)) {
    const hits = brandRows.filter(r => r.modelSlug === candidate || r.modelSlug!.startsWith(`${candidate}-`))
    if (!hits.length) continue
    return hits
      .flatMap(r => {
        const t = tier(r)
        return t === null ? [] : [{ r, t }]
      })
      .sort((a, b) => a.t - b.t || (b.r.publishedAt ?? '').localeCompare(a.r.publishedAt ?? ''))
      .slice(0, MAX_VIDEOS)
      .map(x => x.r)
  }
  return []
}
