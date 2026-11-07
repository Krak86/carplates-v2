import type { BrandPronunciationItem } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'

/** Site language code -> BCP 47 language used to name the IPA's language. */
const IPA_LANG_ALIAS: Record<string, string> = { ua: 'uk' }

/**
 * Name of the language an IPA belongs to (`de` -> "German"), or null for the English reading (`en`) or an unknown code, so the UI
 * labels only a native-language fallback.
 */
export function ipaLangName(ipaLang: string | null, uiLang: string): string | null {
  if (!ipaLang || ipaLang === 'en') return null
  try {
    return (
      new Intl.DisplayNames([toIntlLocale(uiLang)], { type: 'language' }).of(IPA_LANG_ALIAS[ipaLang] ?? ipaLang) ?? null
    )
  } catch {
    return null
  }
}

/**
 * The rows to show: only the UI language's own row when it has something to show (a respelling or an IPA), else every row that
 * does, in the API's order.
 */
export function visibleItems(items: BrandPronunciationItem[], uiLang: string): BrandPronunciationItem[] {
  const shown = items.filter(i => !!i.respell || !!i.ipa)
  const own = shown.filter(i => i.lang === uiLang)
  return own.length ? own : shown
}
