import { flushSync } from 'react-dom'
import { create } from 'zustand'

import i18n, { initialLang, loadLang, persistLang } from '@/i18n'
import { runLangTransition } from '@/lib/view-transition'
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

// Preview: the e-Ukraine typeface (license pending, see PLAN.md) vs the system stack; styled via `[data-font]` in global.css.
const FONTS = ['system', 'e-ukraine'] as const
type Font = (typeof FONTS)[number]

const FONT_STORAGE_KEY = 'carplates.font'

export const FONT_PARAM = 'font'
const DEFAULT_FONT: Font = 'system'

/** `?font=` on a shared link wins for that visit; like `?lang=` it is not persisted (see `toggleFont`). */
function fontFromUrl(): Font | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(FONT_PARAM)
    return FONTS.find(f => f === fromUrl) ?? null
  } catch {
    return null
  }
}

/** Adds the sharer's font to a share link's params, only when it isn't the default. */
export function setFontParam(params: URLSearchParams): void {
  const { font } = useUiStore.getState()
  if (font !== DEFAULT_FONT) params.set(FONT_PARAM, font)
}

function initialFont(): Font {
  const fromUrl = fontFromUrl()
  if (fromUrl) return fromUrl
  try {
    const saved = localStorage.getItem(FONT_STORAGE_KEY)
    if (FONTS.some(f => f === saved)) return saved as Font
  } catch {
    /* private mode / disabled storage */
  }
  return 'system'
}

function applyFont(font: Font): void {
  document.documentElement.dataset.font = font
}

const startFont = initialFont()
applyFont(startFont)

interface UiState {
  lang: Lang
  /** The language being fetched after a switch (null when idle) — the UI shows a spinner and keeps the old one until it lands. */
  langLoading: Lang | null
  theme: Theme
  font: Font
  drawerOpen: boolean
  cardTiltEnabled: boolean
  setLang: (lang: Lang) => Promise<void>
  toggleTheme: () => void
  toggleFont: () => void
  setDrawerOpen: (open: boolean) => void
  toggleCardTilt: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  lang: initialLang(),
  langLoading: null,
  theme: startTheme,
  font: startFont,
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
    // An explicit choice replaces a shared link's ?lang=, so a reload doesn't snap back to it.
    const url = new URL(window.location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', lang)
      window.history.replaceState(window.history.state, '', url)
    }
    // Resources are loaded, so changeLanguage emits synchronously; flushSync commits the new text
    // inside the view-transition callback, where the browser snapshots the "after" state.
    runLangTransition(() => {
      flushSync(() => {
        void i18n.changeLanguage(lang)
        set({ lang, langLoading: null })
      })
    })
  },
  toggleTheme: (): void =>
    set(s => {
      const theme = s.theme === 'light' ? 'dark' : 'light'
      applyTheme(theme)
      persistTheme(theme)
      return { theme }
    }),
  toggleFont: (): void =>
    set(s => {
      const font = s.font === 'system' ? 'e-ukraine' : 'system'
      applyFont(font)
      try {
        localStorage.setItem(FONT_STORAGE_KEY, font)
      } catch {
        /* private mode / disabled storage */
      }
      // An explicit choice replaces a shared link's ?font=, so a reload doesn't snap back to it.
      const url = new URL(window.location.href)
      if (url.searchParams.has(FONT_PARAM)) {
        if (font === DEFAULT_FONT) url.searchParams.delete(FONT_PARAM)
        else url.searchParams.set(FONT_PARAM, font)
        window.history.replaceState(window.history.state, '', url)
      }
      return { font }
    }),
  setDrawerOpen: (drawerOpen): void => set({ drawerOpen }),
  toggleCardTilt: (): void =>
    set(s => {
      const cardTiltEnabled = !s.cardTiltEnabled
      persistCardTiltEnabled(cardTiltEnabled)
      return { cardTiltEnabled }
    })
}))
