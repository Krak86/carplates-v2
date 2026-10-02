import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

const ROWS = [
  [
    { to: '/history', icon: '🕘', key: 'history.viewLink' },
    { to: '/favorites', icon: '⭐', key: 'favorites.viewLink' }
  ],
  [
    { to: '/stats', icon: '📊', key: 'stats.viewLink' },
    { to: '/fuel', icon: '⛽', key: 'fuel.viewLink' },
    { to: '/safety', icon: '🛡️', key: 'safety.viewLink' }
  ]
] as const

/** Shortcut links shown at the bottom of every page. */
export default function QuickLinks(): ReactNode {
  const { t } = useTranslation()

  return (
    <nav className="flex flex-col items-center gap-3 px-4 pb-6 md:pb-8">
      {ROWS.map(row => (
        <div key={row[0].to} className="flex flex-wrap justify-center gap-3">
          {row.map(link => (
            <Link
              viewTransition
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-sm text-[var(--color-primary)]"
            >
              <span aria-hidden className="no-underline">
                {link.icon}
              </span>
              <span className="underline hover:no-underline">{t(link.key)}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
