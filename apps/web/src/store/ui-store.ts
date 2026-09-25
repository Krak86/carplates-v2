import { create } from 'zustand'

import i18n, { initialLang, persistLang } from '@/i18n'
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

interface UiState {
  lang: Lang
  theme: Theme
  drawerOpen: boolean
  cardTiltEnabled: boolean
  setLang: (lang: Lang) => void
  toggleTheme: () => void
  setDrawerOpen: (open: boolean) => void
  toggleCardTilt: () => void
}

export const useUiStore = create<UiState>(set => ({
  lang: initialLang(),
  theme: 'light',
  drawerOpen: false,
  cardTiltEnabled: initialCardTiltEnabled(),
  setLang: (lang): void => {
    persistLang(lang)
    void i18n.changeLanguage(lang)
    set({ lang })
  },
  toggleTheme: (): void =>
    set(s => {
      const theme = s.theme === 'light' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
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
