import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/profile', icon: '👤', labelKey: 'auth.profile', adminOnly: false },
  { to: '/settings', icon: '⚙️', labelKey: 'auth.mySettings', adminOnly: false },
  { to: '/features', icon: '💎', labelKey: 'auth.myFeatures', adminOnly: false },
  { to: '/admin', icon: '🛠️', labelKey: 'auth.adminPage', adminOnly: true }
] as const

/** Links between the signed-in account pages (same set as the account menu), so each one is reachable from the others. */
export default function AccountNav(): ReactNode {
  const { t } = useTranslation()
  const { isAdmin } = useSession()

  return (
    <nav aria-label={t('auth.menu')} className="mb-3 flex flex-wrap gap-2">
      {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => (
        <NavLink
          key={item.to}
          viewTransition
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-[var(--color-primary)] bg-primary/10 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)]'
            )
          }
        >
          <span aria-hidden>{item.icon}</span> {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
