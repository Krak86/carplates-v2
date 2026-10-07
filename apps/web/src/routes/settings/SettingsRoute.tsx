import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import AppearanceTab from '@/routes/settings/AppearanceTab'

/** One entry per settings tab — add the id, its `settings.tabs.<id>` label and a panel below to grow the page. */
const SETTINGS_TABS = ['appearance'] as const
type SettingsTab = (typeof SETTINGS_TABS)[number]
const DEFAULT_TAB: SettingsTab = 'appearance'

const isTab = (value: string | null): value is SettingsTab => SETTINGS_TABS.some(tab => tab === value)

// Lazy-loaded (see App.tsx).
export default function SettingsRoute(): ReactNode {
  const { t } = useTranslation()
  const { user, isPending } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()

  if (isPending) return <Spinner />

  // Sign-in-only page: anonymous visitors (and offline, where the session never counts) go to the homepage.
  if (!user) return <Navigate to="/" replace />

  const requested = searchParams.get('tab')
  const tab = isTab(requested) ? requested : DEFAULT_TAB

  return (
    <div className="mx-auto w-full max-w-content">
      <Card className="mb-4">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <div role="tablist" className="mt-3 flex gap-2">
          {SETTINGS_TABS.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`settings-panel-${id}`}
              onClick={() => setSearchParams(id === DEFAULT_TAB ? {} : { tab: id }, { replace: true })}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-[var(--color-primary)] bg-primary/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg)]'
              )}
            >
              {t(`settings.tabs.${id}`)}
            </button>
          ))}
        </div>
      </Card>

      <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
        {tab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  )
}
