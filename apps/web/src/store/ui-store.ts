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

const BLUEPRINT_STORAGE_KEY = 'carplates.blueprint'

function initialBlueprintEnabled(): boolean {
  try {
    return localStorage.getItem(BLUEPRINT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistBlueprintEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BLUEPRINT_STORAGE_KEY, String(enabled))
  } catch {
    /* private mode / disabled storage */
  }
}

const THEME_STORAGE_KEY = 'carplates.theme'
const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#0f141f' }

/** `auto` follows the OS and is stored as "no saved value". */
export const THEME_MODES = ['auto', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

function initialThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode / disabled storage */
  }
  return 'auto'
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode !== 'auto') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

function persistThemeMode(mode: ThemeMode): void {
  try {
    if (mode === 'auto') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* private mode / disabled storage */
  }
}

const startThemeMode = initialThemeMode()
const startTheme = resolveTheme(startThemeMode)
applyTheme(startTheme)

// Accent color and text size: `[data-accent]` / `[data-text-size]` on <html>, styled in global.css (default = attribute absent).
export const ACCENTS = ['blue', 'green', 'orange', 'red', 'violet', 'neutral'] as const
export type Accent = (typeof ACCENTS)[number]
export const TEXT_SIZES = ['sm', 'md', 'lg'] as const
export type TextSize = (typeof TEXT_SIZES)[number]

const ACCENT_STORAGE_KEY = 'carplates.accent'
const TEXT_SIZE_STORAGE_KEY = 'carplates.textSize'
const DEFAULT_ACCENT: Accent = 'blue'
const DEFAULT_TEXT_SIZE: TextSize = 'md'

function readSaved<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return allowed.find(v => v === saved) ?? fallback
  } catch {
    return fallback
  }
}

function persistSaved(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode / disabled storage */
  }
}

function applyAccent(accent: Accent): void {
  if (accent === DEFAULT_ACCENT) delete document.documentElement.dataset.accent
  else document.documentElement.dataset.accent = accent
}

function applyTextSize(size: TextSize): void {
  if (size === DEFAULT_TEXT_SIZE) delete document.documentElement.dataset.textSize
  else document.documentElement.dataset.textSize = size
}

const startAccent = readSaved(ACCENT_STORAGE_KEY, ACCENTS, DEFAULT_ACCENT)
const startTextSize = readSaved(TEXT_SIZE_STORAGE_KEY, TEXT_SIZES, DEFAULT_TEXT_SIZE)
applyAccent(startAccent)
applyTextSize(startTextSize)

// Preview: the e-Ukraine typeface (license pending, see PLAN.md) and ZAKON vs the system stack; styled via `[data-font]` in global.css.
export const FONTS = ['system', 'e-ukraine', 'zakon'] as const
export type Font = (typeof FONTS)[number]

const FONT_STORAGE_KEY = 'carplates.font'

export const FONT_PARAM = 'font'
const DEFAULT_FONT: Font = 'system'

/** `?font=` on a shared link wins for that visit; like `?lang=` it is not persisted (see `setFont`). */
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
  /** The resolved theme; `themeMode` is the user's choice (`auto` = follow the OS). */
  theme: Theme
  themeMode: ThemeMode
  accent: Accent
  textSize: TextSize
  font: Font
  drawerOpen: boolean
  cardTiltEnabled: boolean
  /** Size drawings in blueprint style (white lines on a scaled grid). */
  blueprintEnabled: boolean
  setLang: (lang: Lang) => Promise<void>
  setThemeMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
  setTextSize: (size: TextSize) => void
  setFont: (font: Font) => void
  setDrawerOpen: (open: boolean) => void
  toggleCardTilt: () => void
  toggleBlueprint: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  lang: initialLang(),
  langLoading: null,
  theme: startTheme,
  themeMode: startThemeMode,
  accent: startAccent,
  textSize: startTextSize,
  font: startFont,
  drawerOpen: false,
  cardTiltEnabled: initialCardTiltEnabled(),
  blueprintEnabled: initialBlueprintEnabled(),
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
  setThemeMode: (themeMode): void => {
    const theme = resolveTheme(themeMode)
    applyTheme(theme)
    persistThemeMode(themeMode)
    set({ themeMode, theme })
  },
  setAccent: (accent): void => {
    applyAccent(accent)
    persistSaved(ACCENT_STORAGE_KEY, accent)
    set({ accent })
  },
  setTextSize: (textSize): void => {
    persistSaved(TEXT_SIZE_STORAGE_KEY, textSize)
    // Reflowing text morphs through a view transition, like a language switch.
    runLangTransition(() => {
      flushSync(() => {
        applyTextSize(textSize)
        set({ textSize })
      })
    })
  },
  setFont: (font): void => {
    runLangTransition(() => {
      flushSync(() => {
        applyFont(font)
        set({ font })
      })
    })
    persistSaved(FONT_STORAGE_KEY, font)
    // An explicit choice replaces a shared link's ?font=, so a reload doesn't snap back to it.
    const url = new URL(window.location.href)
    if (url.searchParams.has(FONT_PARAM)) {
      if (font === DEFAULT_FONT) url.searchParams.delete(FONT_PARAM)
      else url.searchParams.set(FONT_PARAM, font)
      window.history.replaceState(window.history.state, '', url)
    }
  },
  setDrawerOpen: (drawerOpen): void => set({ drawerOpen }),
  toggleCardTilt: (): void =>
    set(s => {
      const cardTiltEnabled = !s.cardTiltEnabled
      persistCardTiltEnabled(cardTiltEnabled)
      return { cardTiltEnabled }
    }),
  toggleBlueprint: (): void =>
    set(s => {
      const blueprintEnabled = !s.blueprintEnabled
      persistBlueprintEnabled(blueprintEnabled)
      return { blueprintEnabled }
    })
}))

// In `auto` mode the theme tracks the OS live (e.g. the phone's day/night schedule).
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { themeMode } = useUiStore.getState()
    if (themeMode !== 'auto') return
    const theme = resolveTheme('auto')
    applyTheme(theme)
    useUiStore.setState({ theme })
  })
} catch {
  /* no matchMedia (tests) */
}
