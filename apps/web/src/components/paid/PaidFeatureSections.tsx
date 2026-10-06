import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { PaidFeature } from '@carplates/shared'

import { useSession } from '@/components/auth/use-session'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { PAID_FEATURE_ICON } from '@/lib/paid-features'
import { featuresQuery } from '@/lib/queries'

type Props = {
  /** Plate-based result vs. VIN-only result — decides which features apply. */
  hasPlate: boolean
  hasVin: boolean
}

/** Which result card kinds each feature belongs to. */
const APPLIES_TO: Record<PaidFeature, { plate: boolean; vin: boolean }> = {
  ria_ads: { plate: true, vin: true },
  ria_avg_price: { plate: true, vin: true },
  platesmania: { plate: true, vin: false },
  auction_history: { plate: false, vin: true }
}

/**
 * One placeholder section per paid feature the signed-in user opted into. The real data sources aren't wired up yet
 * (see PLAN.md "Paid features") — each one will replace its placeholder text, gated by the same flag.
 */
export default function PaidFeatureSections({ hasPlate, hasVin }: Props): ReactNode {
  const { t } = useTranslation()
  const { user } = useSession()
  const features = useQuery({ ...featuresQuery(), enabled: !!user })

  if (!user || !features.isSuccess) return null

  const active = features.data.features.filter(
    f => f.enabled && ((hasPlate && APPLIES_TO[f.feature].plate) || (hasVin && APPLIES_TO[f.feature].vin))
  )

  return (
    <>
      {active.map(({ feature }) => (
        <VinToggleSection
          key={feature}
          icon={PAID_FEATURE_ICON[feature]}
          title={t(`paid.${feature}.title`)}
          showLabel={t('vin.show')}
          hideLabel={t('vin.hide')}
        >
          <p className="text-base text-[var(--color-muted)]">
            <span className="mr-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-[var(--color-primary)]">
              {t('features.placeholderTag')}
            </span>
            {t(`paid.${feature}.placeholder`)}
          </p>
        </VinToggleSection>
      ))}
    </>
  )
}
