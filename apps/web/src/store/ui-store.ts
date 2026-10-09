import { create } from 'zustand'

import i18n, { initialLang, loadLang, persistLang } from '@/i18n'
import type { Lang } from '@/i18n'

type Theme = 'light' | 'dark'

const CARD_TILT_STORAGE_KEY = 'carplates.cardTiltEnabled'

function initialCardTiltEnabled(): boolean {
  try {
    return localStorage.getItem(CARD_TILT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistCardTiltEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CARD_TILT_STORAGE_KEY, String(enabled))
  } catch {
    /* private mode / disabled storage */
  }
}

const THEME_STORAGE_KEY = 'carplates.theme'
const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#0f141f' }

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode / disabled storage */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode / disabled storage */
  }
}

const startTheme = initialTheme()
applyTheme(startTheme)

interface UiState {
  lang: Lang
  /** The language being fetched after a switch (null when idle) — the UI shows a spinner and keeps the old one until it lands. */
  langLoading: Lang | null
  theme: Theme
  drawerOpen: boolean
  cardTiltEnabled: boolean
  setLang: (lang: Lang) => Promise<void>
  toggleTheme: () => void
  setDrawerOpen: (open: boolean) => void
  toggleCardTilt: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  lang: initialLang(),
  langLoading: null,
  theme: startTheme,
  drawerOpen: false,
  cardTiltEnabled: initialCardTiltEnabled(),
  setLang: async lang => {
    set({ langLoading: lang })
    try {
      await loadLang(lang)
    } catch {
      // Offline and not cached: stay on the current language.
      if (get().langLoading === lang) set({ langLoading: null })
      return
    }
    // A newer pick superseded this one while it loaded.
    if (get().langLoading !== lang) return
    persistLang(lang)
    await i18n.changeLanguage(lang)
    // An explicit choice replaces a shared link's ?lang=, so a reload doesn't snap back to it.
    const url = new URL(window.location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', lang)
      window.history.replaceState(window.history.state, '', url)
    }
    set({ lang, langLoading: null })
  },
  toggleTheme: (): void =>
    set(s => {
      const theme = s.theme === 'light' ? 'dark' : 'light'
      applyTheme(theme)
      persistTheme(theme)
      return { theme }
    }),
  setDrawerOpen: (drawerOpen): void => set({ drawerOpen }),
  toggleCardTilt: (): void =>
    set(s => {
      const cardTiltEnabled = !s.cardTiltEnabled
      persistCardTiltEnabled(cardTiltEnabled)
      return { cardTiltEnabled }
    })
}))
