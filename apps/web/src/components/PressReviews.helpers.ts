import type { PressLang, ReviewsResponse } from '@carplates/shared'

type PressReview = ReviewsResponse['press'][number]

/** UI language code -> the article-edition code the press catalog uses. */
const EDITION_OF_UI: Record<string, PressLang> = { ua: 'uk', ru: 'ru', en: 'en' }
/** Edition code -> the `LangBadge` code. */
export const BADGE_OF_EDITION: Record<PressLang, 'ua' | 'ru' | 'en'> = { uk: 'ua', ru: 'ru', en: 'en' }
/** Order the editions are tried in once the UI language has none (a Ukrainian-market site first). */
const FALLBACK_EDITIONS: PressLang[] = ['uk', 'ru', 'en']

/** Editions of `review` in the order they should show: the UI language first, then the rest. */
export function orderedEditions(review: PressReview, uiLang: string): PressLang[] {
  const preferred = EDITION_OF_UI[uiLang]
  const present = FALLBACK_EDITIONS.filter(e => !!review.langs[e])
  return preferred && present.includes(preferred) ? [preferred, ...present.filter(e => e !== preferred)] : present
}
