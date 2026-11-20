import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const LANGS = ['ua', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

type Dictionary = Record<string, string>

// One chunk per language: a visit only downloads the one it uses. `ua` is also the fallback for keys the other
// languages lack (en lacks ~9%: vin.var.*, some plural forms), so every non-ua language loads it too - but for the
// starting language only in the background (see `loadLang`), so it does not gate the first render.
const LOADERS: Record<Lang, () => Promise<{ default: Dictionary }>> = {
  ua: () => import('./ua.json'),
  ru: () => import('./ru.json'),
  en: () => import('./en.json')
}
const FALLBACK_LANG: Lang = 'ua'

const STORAGE_KEY = 'carplates.lang'

/** `?lang=` on a shared link wins for that visit; it is deliberately not persisted (see `setLang`). */
function langFromUrl(): Lang | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    return fromUrl && (LANGS as readonly string[]).includes(fromUrl) ? (fromUrl as Lang) : null
  } catch {
    return null
  }
}

export function initialLang(): Lang {
  const fromUrl = langFromUrl()
  if (fromUrl) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang
  } catch {
    /* private mode / disabled storage */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'uk'
  if (nav === 'ru') return 'ru'
  if (nav === 'ua' || nav === 'uk') return 'ua'
  return 'en'
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

void i18n.use(initReactI18next).init({
  resources: {},
  lng: initialLang(),
  fallbackLng: FALLBACK_LANG,
  interpolation: { escapeValue: false },
  // Resources arrive asynchronously; the app waits for `i18nReady` before its first render and for `loadLang` before a switch.
  // 'added': components re-render when the background fallback dictionary arrives (default is no re-render).
  react: { useSuspense: false, bindI18nStore: 'added' }
})

/**
 * Fetches (once) the dictionary for `lang` and registers it with i18next. The fallback (`ua`) is awaited too unless
 * `deferFallback`: then it loads in the background once the page has loaded (a failed fetch is ignored: missing keys just show as keys).
 */
export async function loadLang(lang: Lang, deferFallback = false): Promise<void> {
  const load = async (l: Lang): Promise<void> => {
    if (i18n.hasResourceBundle(l, 'translation')) return
    const dict = await LOADERS[l]()
    i18n.addResourceBundle(l, 'translation', dict.default, true, true)
  }
  if (lang === FALLBACK_LANG) return load(lang)
  if (deferFallback) {
    await load(lang)
    // After the window `load` event, so the 180 KB does not compete with the first paint and the hero photo.
    const start = (): void => void load(FALLBACK_LANG).catch(() => undefined)
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return
  }
  await Promise.all([load(lang), load(FALLBACK_LANG)])
}

/** Resolves when the starting language is loaded — await it before the first render. */
export const i18nReady = loadLang(initialLang(), true)

export default i18n
