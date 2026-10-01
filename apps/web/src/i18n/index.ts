import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import ru from './ru.json'
import ua from './ua.json'

export const LANGS = ['ua', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

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
  resources: {
    ua: { translation: ua },
    ru: { translation: ru },
    en: { translation: en }
  },
  lng: initialLang(),
  fallbackLng: 'ua',
  interpolation: { escapeValue: false }
})

export default i18n
