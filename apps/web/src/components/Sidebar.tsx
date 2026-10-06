import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import OfflineDataSettings from '@/components/OfflineDataSettings'
import { LANGS } from '@/i18n'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

const LANG_LABEL: Record<Lang, string> = { ua: 'Українська', ru: 'Русский', en: 'English' }

// Lazy-loaded (see App.tsx) — not part of the LCP path.
export default function Sidebar(): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const setLang = useUiStore(s => s.setLang)
  const theme = useUiStore(s => s.theme)
  const toggleTheme = useUiStore(s => s.toggleTheme)
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)

  const handleClose = (): void => setDrawerOpen(false)

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'block rounded-lg bg-[var(--color-surface)]/60 px-3 py-2 transition-colors duration-200 hover:bg-[var(--color-surface)]',
      isActive ? 'bg-[var(--color-surface)] font-medium' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
    )

  return (
    <nav className="flex h-full w-64 flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md">
      <NavLink viewTransition to="/" className={linkClass} onClick={handleClose} end>
        <span aria-hidden>🔍</span> {t('nav.search')}
      </NavLink>
      <NavLink viewTransition to="/advanced-search" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🧭</span> {t('nav.advancedSearch')}
      </NavLink>
      <NavLink viewTransition to="/about" className={linkClass} onClick={handleClose}>
        <span aria-hidden>ℹ️</span> {t('nav.about')}
      </NavLink>
      <NavLink viewTransition to="/history" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🕘</span> {t('nav.history')}
      </NavLink>
      <NavLink viewTransition to="/favorites" className={linkClass} onClick={handleClose}>
        <span aria-hidden>⭐</span> {t('nav.favorites')}
      </NavLink>
      <NavLink viewTransition to="/stats" className={linkClass} onClick={handleClose}>
        <span aria-hidden>📊</span> {t('nav.stats')}
      </NavLink>
      <NavLink viewTransition to="/fuel" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🌿</span> {t('nav.fuel')}
      </NavLink>
      <NavLink viewTransition to="/safety" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🛡️</span> {t('nav.safety')}
      </NavLink>
      <NavLink viewTransition to="/news" className={linkClass} onClick={handleClose}>
        <span aria-hidden>📰</span> {t('nav.news')}
      </NavLink>
      <NavLink viewTransition to="/discuss" className={linkClass} onClick={handleClose}>
        <span aria-hidden>💬</span> {t('nav.discuss')}
      </NavLink>

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.language')}</div>
      {LANGS.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => {
            setLang(l)
            handleClose()
          }}
          className={cn(
            'rounded-lg bg-[var(--color-surface)]/60 px-3 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-[var(--color-surface)]',
            l === lang
              ? 'bg-[var(--color-surface)] font-medium text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
          )}
        >
          {LANG_LABEL[l]}
        </button>
      ))}

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.theme')}</div>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={toggleTheme}
        className="rounded-lg bg-[var(--color-surface)]/60 px-3 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-[var(--color-surface)]"
      >
        <span aria-hidden>{theme === 'dark' ? '🌙' : '☀️'}</span>{' '}
        {theme === 'dark' ? t('nav.themeDark') : t('nav.themeLight')}
      </button>

      <OfflineDataSettings />
    </nav>
  )
}
