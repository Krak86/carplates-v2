export const RELEASE_GROUPS = ['new', 'improved', 'data', 'fix'] as const
export type ReleaseGroup = (typeof RELEASE_GROUPS)[number]

export const RELEASE_LANGS = ['ua', 'ru', 'en'] as const
export type ReleaseLang = (typeof RELEASE_LANGS)[number]

export type ReleaseItem = { group: ReleaseGroup } & Record<ReleaseLang, string>

/** `version`: `v2.<stage commit count>` at the end of that day (same scheme as the app footer). */
export type ReleaseDay = { date: string; version?: string; items: readonly ReleaseItem[] }

export const item = (group: ReleaseGroup, ua: string, ru: string, en: string): ReleaseItem => ({ group, ua, ru, en })

/**
 * Months that have a `releases/<yyyy-mm>.ts` file, newest first. A new month = a new file, an entry here, an entry in
 * the barrel (`../releases.ts`) and one in the web loader map (`apps/web/src/routes/releases/months.ts`); tests
 * fail if any of them drifts.
 */
export const RELEASE_MONTHS = ['2026-11', '2026-10', '2026-09'] as const
export type ReleaseMonth = (typeof RELEASE_MONTHS)[number]
