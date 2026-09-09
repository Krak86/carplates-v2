import { create } from 'zustand'

import i18n, { initialLang, persistLang } from '@/i18n'
import type { Lang } from '@/i18n'

type Theme = 'light' | 'dark'

interface UiState {
  lang: Lang
  theme: Theme
  drawerOpen: boolean
  setLang: (lang: Lang) => void
  toggleTheme: () => void
  setDrawerOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>(set => ({
  lang: initialLang(),
  theme: 'light',
  drawerOpen: false,
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
  setDrawerOpen: (drawerOpen): void => set({ drawerOpen })
}))
