import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const LANGS = ['ua', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

type Dictionary = Record<string, string>

// One chunk per language: a visit only downloads the one it uses. `ua` is also the fallback for keys the other
// languages lack (en has far fewer), so every non-ua language loads it alongside.
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
  react: { useSuspense: false }
})

/** Fetches (once) the dictionary for `lang` plus the fallback, and registers it with i18next. */
export async function loadLang(lang: Lang): Promise<void> {
  const wanted = lang === FALLBACK_LANG ? [lang] : [lang, FALLBACK_LANG]
  await Promise.all(
    wanted
      .filter(l => !i18n.hasResourceBundle(l, 'translation'))
      .map(async l => {
        const dict = await LOADERS[l]()
        i18n.addResourceBundle(l, 'translation', dict.default, true, true)
      })
  )
}

/** Resolves when the starting language is loaded — await it before the first render. */
export const i18nReady = loadLang(initialLang())

export default i18n
