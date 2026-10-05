import { pickCommonsCandidate, scoreCommonsTitle, wikiImageFromInfo } from '@carplates/shared'
import type { CommonsImageInfo, WikiImage } from '@carplates/shared'

/** Pure planning for the Commons pre-warm (`wiki-images.ts`): which search hits to spend an imageinfo request on, and
 *  how a registry year without its own photo borrows the nearest year's. */

const PER_YEAR = 3
/** A 2005 car shouldn't get a 2024 photo — beyond this many years the model-level row serves instead. */
export const MAX_NEAREST_GAP = 4

export type YearPlan = {
  year: number
  /** Shortlisted file titles, best title score first. Empty = Commons has nothing for this model near this year. */
  titles: string[]
  /** `titles` belong to `fromYear`, not `year`. */
  nearest: boolean
  fromYear: number
}

/** Standalone 4-digit years (1950-2039) in a file title, ignoring date stamps like `2008-11-12`. */
export function titleYears(title: string): number[] {
  const withoutDates = title.replace(/\d{4}-\d{2}-\d{2}/g, ' ')
  const years = [...withoutDates.matchAll(/(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)/g)].map(m => Number(m[1]))
  return [...new Set(years)]
}

/** Per registry year: the best-titled search hits for that year, else those of the nearest year within the gap. */
export function planYears(titles: string[], model: string, years: number[]): YearPlan[] {
  const byYear = new Map<number, string[]>()
  for (const title of titles) {
    for (const year of titleYears(title)) {
      if (scoreCommonsTitle(title, model, year) !== null) byYear.set(year, [...(byYear.get(year) ?? []), title])
    }
  }
  // Best score first; the stable sort keeps Commons' relevance order on ties.
  for (const [year, list] of byYear) {
    byYear.set(
      year,
      [...list].sort((a, b) => (scoreCommonsTitle(b, model, year) ?? 0) - (scoreCommonsTitle(a, model, year) ?? 0))
    )
  }
  const available = [...byYear.keys()]

  return years.map(year => {
    const exact = byYear.get(year)
    if (exact?.length) return { year, titles: exact.slice(0, PER_YEAR), nearest: false, fromYear: year }

    const nearest = available
      .filter(y => Math.abs(y - year) <= MAX_NEAREST_GAP)
      .sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || b - a)[0]
    if (nearest === undefined) return { year, titles: [], nearest: false, fromYear: year }
    return { year, titles: (byYear.get(nearest) ?? []).slice(0, PER_YEAR), nearest: true, fromYear: nearest }
  })
}

/** The shortlisted title whose real metadata (type, size, aspect) passes the same rules as the live path. */
export function resolveYearImage(
  plan: YearPlan,
  model: string,
  infoByTitle: Map<string, Partial<CommonsImageInfo>>
): { image: WikiImage; title: string } | null {
  const candidates = plan.titles.flatMap(title => {
    const info = infoByTitle.get(title)
    return info?.thumburl && info.mime && info.width && info.height
      ? [{ title, mime: info.mime, width: info.width, height: info.height, info }]
      : []
  })
  const best = pickCommonsCandidate(candidates, model, plan.fromYear)
  const image = best ? wikiImageFromInfo(best.info) : null
  return best && image ? { image, title: best.title } : null
}
