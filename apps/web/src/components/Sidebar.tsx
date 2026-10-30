import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import LoginButton from '@/components/auth/LoginButton'
import LayersButton from '@/components/LayersButton'
import OfflineDataSettings from '@/components/OfflineDataSettings'
import Spinner from '@/components/ui/Spinner'
import { LANGS } from '@/i18n'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/cn'
import { ACCENTS, FONTS, TEXT_SIZES, THEME_MODES, useUiStore } from '@/store/ui-store'
import type { Accent, Font, TextSize, ThemeMode } from '@/store/ui-store'

const LANG_LABEL: Record<Lang, string> = { ua: 'Українська', ru: 'Русский', en: 'English' }

const FONT_LABEL_KEY: Record<Font, 'nav.fontSystem' | 'nav.fontEUkraine' | 'nav.fontZakon'> = {
  system: 'nav.fontSystem',
  'e-ukraine': 'nav.fontEUkraine',
  zakon: 'nav.fontZakon'
}

const THEME_MODE_KEY: Record<ThemeMode, 'nav.themeAuto' | 'nav.themeLight' | 'nav.themeDark'> = {
  auto: 'nav.themeAuto',
  light: 'nav.themeLight',
  dark: 'nav.themeDark'
}

// Swatches show the light-theme accent (the same hues as the `[data-accent]` tokens in global.css).
const ACCENT_SWATCH: Record<Accent, string> = {
  blue: 'hsl(222 89% 55%)',
  green: 'hsl(150 70% 30%)',
  orange: 'hsl(24 90% 40%)',
  red: 'hsl(2 75% 48%)',
  violet: 'hsl(268 70% 50%)',
  neutral: 'hsl(220 15% 25%)'
}

const TEXT_SIZE_CLASS: Record<TextSize, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' }

// Lazy-loaded (see App.tsx) — not part of the LCP path.
export default function Sidebar(): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const setLang = useUiStore(s => s.setLang)
  const langLoading = useUiStore(s => s.langLoading)
  const themeMode = useUiStore(s => s.themeMode)
  const setThemeMode = useUiStore(s => s.setThemeMode)
  const accent = useUiStore(s => s.accent)
  const setAccent = useUiStore(s => s.setAccent)
  const textSize = useUiStore(s => s.textSize)
  const setTextSize = useUiStore(s => s.setTextSize)
  const font = useUiStore(s => s.font)
  const setFont = useUiStore(s => s.setFont)
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)

  const { user, isAdmin } = useSession()

  const handleClose = (): void => setDrawerOpen(false)

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'block rounded-lg bg-[var(--color-surface)]/60 px-3 py-2 transition-colors duration-200 hover:bg-[var(--color-surface)]',
      isActive ? 'bg-[var(--color-surface)] font-medium' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
    )

  const accountLinkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'block rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-[var(--color-primary)]/20',
      isActive
        ? 'bg-[var(--color-primary)]/20 font-medium'
        : 'bg-[var(--color-primary)]/10 text-[var(--color-muted)] hover:text-[var(--color-fg)]'
    )

  return (
    <nav className="flex h-full w-full flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md">
      {/* Mobile only: the header hides these below md. The row is the popovers' positioning context. */}
      <div className="relative mb-1 flex gap-2 md:hidden">
        <LayersButton inSidebar />
        <LoginButton inSidebar onNavigate={handleClose} />
      </div>
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
      <NavLink viewTransition to="/cars" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🚗</span> {t('nav.cars')}
      </NavLink>
      <NavLink viewTransition to="/fuel" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🌿</span> {t('nav.fuel')}
      </NavLink>
      <NavLink viewTransition to="/safety" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🛡️</span> {t('nav.safety')}
      </NavLink>
      <NavLink viewTransition to="/wanted" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🚨</span> {t('nav.wanted')}
      </NavLink>
      <NavLink viewTransition to="/news" className={linkClass} onClick={handleClose}>
        <span aria-hidden>📰</span> {t('nav.news')}
      </NavLink>
      <NavLink viewTransition to="/discuss" className={linkClass} onClick={handleClose}>
        <span aria-hidden>💬</span> {t('nav.discuss')}
      </NavLink>
      <NavLink viewTransition to="/play" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🎲</span> {t('nav.play')}
      </NavLink>
      <NavLink viewTransition to="/race" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🎮</span> {t('nav.race')}
      </NavLink>
      <NavLink viewTransition to="/relax" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🧘</span> {t('nav.relax')}
      </NavLink>
      <NavLink viewTransition to="/read" className={linkClass} onClick={handleClose}>
        <span aria-hidden>📖</span> {t('nav.read')}
      </NavLink>
      <NavLink viewTransition to="/share" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🔗</span> {t('nav.share')}
      </NavLink>
      <NavLink viewTransition to="/install" className={linkClass} onClick={handleClose}>
        <span aria-hidden>📲</span> {t('nav.install')}
      </NavLink>
      <NavLink viewTransition to="/releases" className={linkClass} onClick={handleClose}>
        <span aria-hidden>🆕</span> {t('nav.releases')}
      </NavLink>
      {user && (
        <NavLink viewTransition to="/settings" className={accountLinkClass} onClick={handleClose}>
          <span aria-hidden>⚙️</span> {t('nav.settings')}
        </NavLink>
      )}
      {isAdmin && (
        <NavLink viewTransition to="/admin" className={accountLinkClass} onClick={handleClose}>
          <span aria-hidden>🛠️</span> {t('nav.admin')}
        </NavLink>
      )}

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.language')}</div>
      {LANGS.map(l => (
        <button
          key={l}
          type="button"
          disabled={langLoading !== null}
          aria-busy={langLoading === l}
          onClick={() => {
            void setLang(l).then(handleClose)
          }}
          className={cn(
            'flex items-center justify-between gap-2 disabled:cursor-wait',
            'rounded-lg bg-[var(--color-surface)]/60 px-3 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-[var(--color-surface)]',
            l === lang
              ? 'bg-[var(--color-surface)] font-medium text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
          )}
        >
          {LANG_LABEL[l]}
          {langLoading === l && <Spinner />}
        </button>
      ))}

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.theme')}</div>
      <div role="group" aria-label={t('nav.theme')} className="flex gap-1">
        {THEME_MODES.map(mode => (
          <button
            key={mode}
            type="button"
            aria-pressed={mode === themeMode}
            onClick={() => setThemeMode(mode)}
            className={cn(
              'flex-1 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200',
              mode === themeMode
                ? 'bg-[var(--color-surface)] font-medium text-[var(--color-primary)]'
                : 'bg-[var(--color-surface)]/60 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
            )}
          >
            {t(THEME_MODE_KEY[mode])}
          </button>
        ))}
      </div>

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.accent')}</div>
      <div role="group" aria-label={t('nav.accent')} className="flex gap-2 px-3 py-1">
        {ACCENTS.map(a => (
          <button
            key={a}
            type="button"
            aria-pressed={a === accent}
            aria-label={t(`nav.accent.${a}`)}
            title={t(`nav.accent.${a}`)}
            onClick={() => setAccent(a)}
            style={{ background: ACCENT_SWATCH[a] }}
            className={cn(
              'size-7 rounded-full border-2 transition-shadow duration-200',
              a === accent ? 'border-[var(--color-fg)] shadow-md' : 'border-[var(--color-border)]'
            )}
          />
        ))}
      </div>

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.textSize')}</div>
      <div role="group" aria-label={t('nav.textSize')} className="flex gap-1">
        {TEXT_SIZES.map(size => (
          <button
            key={size}
            type="button"
            aria-pressed={size === textSize}
            onClick={() => setTextSize(size)}
            className={cn(
              'flex-1 rounded-lg px-2 py-1.5 transition-colors duration-200',
              TEXT_SIZE_CLASS[size],
              size === textSize
                ? 'bg-[var(--color-surface)] font-medium text-[var(--color-primary)]'
                : 'bg-[var(--color-surface)]/60 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
            )}
          >
            A
          </button>
        ))}
      </div>

      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">{t('nav.font')}</div>
      <div role="group" aria-label={t('nav.font')} className="flex flex-col gap-1">
        {FONTS.map(f => (
          <button
            key={f}
            type="button"
            aria-pressed={f === font}
            onClick={() => setFont(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-left text-sm transition-colors duration-200',
              f === font
                ? 'bg-[var(--color-surface)] font-medium text-[var(--color-primary)]'
                : 'bg-[var(--color-surface)]/60 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
            )}
          >
            {t(FONT_LABEL_KEY[f])}
          </button>
        ))}
      </div>

      <OfflineDataSettings />

      <div className="mt-4 flex gap-3 px-3 text-xs text-[var(--color-muted)]">
        <NavLink to="/privacy" className="underline hover:text-[var(--color-fg)]" onClick={handleClose}>
          {t('legal.privacy.heading')}
        </NavLink>
        <NavLink to="/terms" className="underline hover:text-[var(--color-fg)]" onClick={handleClose}>
          {t('legal.terms.heading')}
        </NavLink>
      </div>
    </nav>
  )
}
