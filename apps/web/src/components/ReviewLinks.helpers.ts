import type { InfocarMatch, ReviewSiteId } from '@carplates/shared'

/** Proper-noun display names for the outbound review-site links — not translated. */
export const REVIEW_SITE_LABEL: Readonly<Record<ReviewSiteId, string>> = {
  'auto-blog': 'Auto-Blog',
  drive2: 'DRIVE2'
}

/** "2018–2021"; a one-year or open-ended range collapses to the year it has, nothing known to ''. */
export function formatYears(yearFrom: number | null, yearTo: number | null): string {
  if (yearFrom === null) return ''
  return yearTo === null || yearTo === yearFrom ? String(yearFrom) : `${yearFrom}–${yearTo}`
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
