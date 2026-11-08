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
 * The rows to show: the UI language's own row plus the English one (the KEE-ah style reading), each only when it has something to
 * show (a respelling or an IPA); when the own row is empty, every row that has content, in the API's order.
 */
export function visibleItems(items: BrandPronunciationItem[], uiLang: string): BrandPronunciationItem[] {
  const shown = items.filter(i => !!i.respell || !!i.ipa)
  const own = shown.filter(i => i.lang === uiLang)
  return own.length ? shown.filter(i => i.lang === uiLang || i.lang === 'en') : shown
}

/** Site language code -> BCP 47 tag for the browser speech voice. */
const SPEECH_LANG: Record<string, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' }

export type Speech = { text: string; lang: string; fallback?: Speech }

function speechOfItem(item: BrandPronunciationItem): Speech | null {
  if (!item.respell) return null
  return {
    text: item.respell
      .normalize('NFD')
      .replace(/\u0301/g, '')
      .normalize('NFC')
      .toLowerCase(),
    lang: SPEECH_LANG[item.lang] ?? 'en-US'
  }
}

/**
 * Text and language for the synthetic voice: the first row's respelling (stress marks and capitals dropped), or null. When the
 * English row differs, it is attached as `fallback` for devices with no voice for the first language (e.g. no Ukrainian voice).
 */
export function speechOf(items: BrandPronunciationItem[]): Speech | null {
  const first = items.find(i => !!i.respell)
  const speech = first && speechOfItem(first)
  if (!first || !speech) return null
  const en = first.lang === 'en' ? null : items.find(i => i.lang === 'en')
  const fallback = en && speechOfItem(en)
  return fallback ? { ...speech, fallback } : speech
}
