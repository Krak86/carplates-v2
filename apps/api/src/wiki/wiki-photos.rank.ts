import { VEHICLE_COLORS, WIKI_PHOTOS_MAX, isClosePaint } from '@carplates/shared'
import type { VehicleColor, WikiPhoto } from '@carplates/shared'
import type { WikiCandidateInfo } from '@carplates/db'

export type PhotoRankOptions = {
  /** The car's registry colour; a photo that already has it ranks first (no filter needed). */
  color: VehicleColor | null
  /** Production years of the car's generation (`yearTo` null = still produced); null = unknown, no generation filter. */
  span: { yearFrom: number; yearTo: number | null } | null
}

const isVehicleColor = (value: string | null): value is VehicleColor => VEHICLE_COLORS.some(c => c === value)

/** Years of slack around a generation: a Commons title year is the registration or model year, not the exact first / last build. */
const SPAN_SLACK = 1

const inSpan = (year: number, span: NonNullable<PhotoRankOptions['span']>): boolean =>
  year >= span.yearFrom - SPAN_SLACK && (span.yearTo === null || year <= span.yearTo + SPAN_SLACK)

/**
 * Candidates -> the photos to show. With a known generation, a photo whose title year lies outside it is dropped (another
 * generation of the model); a photo with no title year stays but ranks below dated ones. Then: paint already matches `color`,
 * dated in-generation first, quality rank. One photo per file, at most `WIKI_PHOTOS_MAX`.
 */
export function rankWikiPhotos(rows: WikiCandidateInfo[], { color, span }: PhotoRankOptions): WikiPhoto[] {
  const scored = rows.flatMap(r => {
    if (span && r.photoYear !== null && !inSpan(r.photoYear, span)) return []
    const colorMatch = !!color && !!r.lab && isClosePaint(r.lab, color)
    const dated = span && r.photoYear !== null ? 1 : 0
    return [{ r, colorMatch, dated }]
  })
  scored.sort((a, b) => +b.colorMatch - +a.colorMatch || b.dated - a.dated || b.r.quality - a.r.quality)
  return scored.slice(0, WIKI_PHOTOS_MAX).map(({ r, colorMatch }) => ({
    url: r.imageUrl,
    width: r.imageWidth,
    height: r.imageHeight,
    title: r.title,
    year: r.photoYear,
    bucket: isVehicleColor(r.bucket) ? r.bucket : null,
    colorMatch,
    attribution:
      r.attrAuthor || r.attrLicense
        ? { author: r.attrAuthor, license: r.attrLicense, licenseUrl: r.attrLicenseUrl }
        : null
  }))
}
