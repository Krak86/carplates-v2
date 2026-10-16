import type { Lang } from '@/i18n'

/** Prose written in all three UI languages (long copy does not belong in the flat i18n JSON). */
export type L10n = Record<Lang, string>

export const LANG_FALLBACK: Lang = 'ua'

export type ArticleMeta = {
  path: string
  icon: string
  /** `nav.*` key naming the article. */
  titleKey: string
  lead: L10n
}

export type UpcomingTopic = { icon: string; title: L10n }
