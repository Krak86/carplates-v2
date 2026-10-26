import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { buildOriginView } from '@/components/OriginSection.helpers'
import type { OriginUkraine } from '@/components/OriginSection.helpers'
import OriginStepBody from '@/components/OriginStepBody'
import ShareButton from '@/components/ShareButton'
import Timeline from '@/components/Timeline'
import { countryLabel } from '@/components/vin/helpers'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { originQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  /** Registry brand (no model). */
  brand: string | null
  model?: string | null
  year?: number | null
  vin?: string | null
  /** NHTSA plant country as ISO 3166-1 alpha-2, and city, when the VIN was decoded. */
  plantCountry?: string | null
  plantCity?: string | null
  /** Registry facts for the last timeline step; null hides it. */
  ukraine?: OriginUkraine | null
  /** Bumped by the origin chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
}

/**
 * Collapsed "Where it comes from" section (shareable via `?section=origin`): brand country, owners, assembly plant and the
 * Ukraine step as a chronological timeline. Renders nothing when no origin fact is known. Mounted by `LazySection`, so its
 * query and chunk start near the viewport.
 */
export default function OriginSection({
  brand,
  model,
  year,
  vin,
  plantCountry,
  plantCity,
  ukraine = null,
  openSignal = 0
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'origin'
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data } = useQuery({
    ...originQuery({ brand: brand ?? '', model, year, vin, plantCountry, plantCity }),
    enabled: !!brand
  })
  const view = buildOriginView(data, year, ukraine)
  const ready = view.steps.length > 0

  useEffect(() => {
    if ((isShared || openSignal > 0) && ready && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal, ready])

  if (!ready) return null

  const title = t('origin.title')
  const brandLabel = brand ?? ''
  const brandStep = view.steps.find(step => step.kind === 'brand')
  const assemblyStep = view.steps.find(step => step.kind === 'assembly')

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🧭"
      title={title}
      actions={<ShareButton section="origin" label={t('share.button', { section: title })} />}
      showLabel={t('origin.show')}
      hideLabel={t('origin.hide')}
      defaultOpen={isShared}
      openSignal={openSignal}
    >
      {view.makerMismatch && (
        <p role="note" className="mb-3 rounded-lg bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-300">
          ⚠️ {t('origin.warn.mismatch', { maker: view.makerMismatch, brand: brandLabel })}
        </p>
      )}

      <details className="mb-3 rounded-lg bg-[var(--color-border)]/30 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">💡 {t('origin.explainer.title')}</summary>

        <div className="mt-2 space-y-2">
          <p className="m-0">{t('origin.explainer.what')}</p>

          <p className="m-0">{t('origin.explainer.sources')}</p>

          <p className="m-0">{t('origin.explainer.why')}</p>

          <p className="m-0 text-[var(--color-muted)]">{t('origin.explainer.disclaimer')}</p>
        </div>
      </details>

      <Timeline
        arrows="down"
        items={view.steps.map(step => ({
          key: step.kind,
          content: <OriginStepBody step={step} />
        }))}
      />

      {(view.northAmericaVin || view.assemblyDiffers) && (
        <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm text-[var(--color-muted)]">
          {view.northAmericaVin && <li>{t('origin.hint.northAmerica')}</li>}

          {view.assemblyDiffers && brandStep?.kind === 'brand' && assemblyStep?.kind === 'assembly' && (
            <li>
              {t('origin.hint.differs', {
                brand: countryLabel(brandStep.country, i18n.language, t),
                plant: countryLabel(assemblyStep.country, i18n.language, t)
              })}
            </li>
          )}
        </ul>
      )}

      {view.asOf && (
        <p className="mt-2 mb-0 text-xs text-[var(--color-muted)]">{t('origin.asOf', { date: view.asOf })}</p>
      )}
    </VinToggleSection>
  )
}
