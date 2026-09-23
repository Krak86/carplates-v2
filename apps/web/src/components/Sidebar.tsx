import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

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
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn('block rounded-lg px-3 py-2', isActive ? 'bg-[var(--color-surface)] font-medium' : 'text-[var(--color-muted)]')

  return (
    <nav className="flex h-full w-64 flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <NavLink to="/" className={linkClass} onClick={() => setDrawerOpen(false)} end>
        {t('nav.search')}
      </NavLink>
      <NavLink to="/about" className={linkClass} onClick={() => setDrawerOpen(false)}>
        {t('nav.about')}
      </NavLink>
      <NavLink to="/history" className={linkClass} onClick={() => setDrawerOpen(false)}>
        {t('nav.history')}
      </NavLink>
      <NavLink to="/favorites" className={linkClass} onClick={() => setDrawerOpen(false)}>
        {t('nav.favorites')}
      </NavLink>
      <NavLink to="/stats" className={linkClass} onClick={() => setDrawerOpen(false)}>
        {t('nav.stats')}
      </NavLink>

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.language')}</div>
      {LANGS.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[var(--color-surface)]',
            l === lang ? 'font-medium text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
          )}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </nav>
  )
}
