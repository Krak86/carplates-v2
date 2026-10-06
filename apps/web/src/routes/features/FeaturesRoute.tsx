import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'
import type { PaidFeature } from '@carplates/shared'

import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import {
  AVAILABLE_PAID_FEATURES,
  CONSIDERING_FEATURES,
  COMING_SOON_FEATURES,
  FUTURE_FEATURE_ICON,
  PAID_FEATURE_ICON
} from '@/lib/paid-features'
import { featuresQuery } from '@/lib/queries'
import { useFeaturesActions } from '@/routes/features/use-features-actions'

/** Read-only lists under the toggles, in page order: planned work first, then ideas still to be decided. */
const FUTURE_SECTIONS = [
  { titleKey: 'features.comingSoon', ids: COMING_SOON_FEATURES },
  { titleKey: 'features.considering', ids: CONSIDERING_FEATURES }
] as const

// Lazy-loaded (see App.tsx). Admins use this same page (and additionally see /admin).
export default function FeaturesRoute(): ReactNode {
  const { t } = useTranslation()
  const { user, isPending } = useSession()
  const features = useQuery({ ...featuresQuery(), enabled: !!user })
  const { save } = useFeaturesActions()
  // Only the user's unsaved edits live here; everything else is derived from the server state.
  const [draft, setDraft] = useState<Partial<Record<PaidFeature, boolean>>>({})

  if (isPending) return <Spinner />

  // Sign-in-only page: anonymous visitors (and offline, where the session never counts) go to the homepage.
  if (!user) return <Navigate to="/" replace />

  const saved = new Map(features.data?.features.map(f => [f.feature, f.enabled]))
  const isOn = (f: PaidFeature): boolean => draft[f] ?? saved.get(f) ?? false
  const changes = AVAILABLE_PAID_FEATURES.filter(f => draft[f] !== undefined && draft[f] !== (saved.get(f) ?? false))

  const handleToggle = (feature: PaidFeature, enabled: boolean): void => {
    save.reset()
    setDraft(d => ({ ...d, [feature]: enabled }))
  }

  const handleSave = (): void => {
    save.mutate(
      { features: changes.map(feature => ({ feature, enabled: isOn(feature) })) },
      { onSuccess: () => setDraft({}) }
    )
  }

  return (
    <div className="mx-auto w-full max-w-content">
      {/* Opaque-ish panel: the page sits over a user-chosen photo/live background, so bare text isn't always legible. */}
      <Card className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('features.title')}</h1>
        <p className="mb-1 text-[var(--color-muted)]">{t('features.intro')}</p>
        <p className="text-sm text-[var(--color-muted)]">{t('features.pricing')}</p>
      </Card>

      {features.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {features.isSuccess && (
        <Card className="divide-y divide-[var(--color-border)] p-0">
          {AVAILABLE_PAID_FEATURES.map(feature => (
            <label key={feature} className="flex cursor-pointer items-start gap-3 p-4 hover:bg-primary/5">
              <input
                type="checkbox"
                checked={isOn(feature)}
                onChange={e => handleToggle(feature, e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-medium">
                  <span aria-hidden>{PAID_FEATURE_ICON[feature]}</span> {t(`paid.${feature}.title`)}
                </span>
                <span className="block text-sm text-[var(--color-muted)]">{t(`paid.${feature}.desc`)}</span>
              </span>
            </label>
          ))}
        </Card>
      )}

      {features.isError && <p className="text-red-600">{t('result.error')}</p>}

      {features.isSuccess && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={changes.length === 0 || save.isPending}
            onClick={handleSave}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {save.isPending ? t('features.saving') : t('features.save')}
          </button>
          {save.isSuccess && <span className="text-sm text-green-700">{t('features.saved')}</span>}
          {save.isError && <span className="text-sm text-red-600">{t('features.error')}</span>}
        </div>
      )}

      {FUTURE_SECTIONS.map(({ titleKey, ids }) => (
        <section key={titleKey}>
          <h2 className="mt-8 mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
            {t(titleKey)}
          </h2>
          <Card className="divide-y divide-[var(--color-border)] p-0">
            {ids.map(id => (
              <div key={id} className="flex items-center gap-3 p-4 text-[var(--color-muted)]">
                <span aria-hidden>{FUTURE_FEATURE_ICON[id]}</span>
                {t(`paid.soon.${id}`)}
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}
