import type { InfocarMatch, ReviewSiteId } from '@carplates/shared'

/** Proper-noun display names for the outbound review-site links — not translated. */
export const REVIEW_SITE_LABEL: Readonly<Record<ReviewSiteId, string>> = {
  drive2: 'DRIVE2'
}

/** "2018–2021"; a one-year or open-ended range collapses to the year it has, nothing known to ''. */
export function formatYears(yearFrom: number | null, yearTo: number | null): string {
  if (yearFrom === null) return ''
  return yearTo === null || yearTo === yearFrom ? String(yearFrom) : `${yearFrom}–${yearTo}`
}

/** "2012–2013" from a year-filtered infocar URL (`?y1=…&y2=…`); '' when the URL carries no usable range. */
export function yearFilterLabel(yearUrl: string | null): string {
  if (!yearUrl) return ''
  const params = new URL(yearUrl).searchParams
  const from = Number(params.get('y1'))
  const to = Number(params.get('y2'))
  return from ? formatYears(from, to || null) : ''
}

export type InfocarLink = {
  /** `level`-dependent: a version title, or null for the model/brand pages (the component supplies a label). */
  title: string | null
  level: InfocarMatch['level']
  url: string
}

/** One link per matching version (best first) for a version-level match, else the single model/brand page link. */
export function infocarLinks(match: InfocarMatch): InfocarLink[] {
  if (match.level !== 'version') return [{ title: null, level: match.level, url: match.url }]
  return match.versions.map(v => ({
    title: [v.name, formatYears(v.yearFrom, v.yearTo)].filter(Boolean).join(' '),
    level: 'version',
    url: v.url
  }))
}
