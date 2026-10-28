import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { gsr2Baseline } from '@/components/vin/gsr2'
import { hasAssists } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import VinAssists from '@/components/vin/VinAssists'
import VinEuBaseline from '@/components/vin/VinEuBaseline'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  /** Decoded NHTSA fields; null while the VIN decode is missing or loading. */
  fields: FieldMap | null
  /** Model year when the RDW register knows this model (an EU-market car), else null: enables the legal baseline. */
  euYear: number | null
}

/**
 * Collapsed "Safety & driver aids" section on the plate card (shareable via `?section=assists`). Shows the decoded
 * assists and, for EU-market models, the GSR2 legal baseline; renders nothing when both are empty.
 */
export default function DriverAssistSection({ fields, euYear }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'assists'
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasDecoded = !!fields && hasAssists(fields)
  const hasBaseline = gsr2Baseline(euYear).length > 0
  const ready = hasDecoded || hasBaseline

  useEffect(() => {
    if (isShared && ready && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, ready])

  if (!ready) return null

  const title = t('vin.assists.title')

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🛟"
      title={title}
      info={<SectionInfo section="assists" title={title} />}
      actions={<ShareButton section="assists" label={t('share.button', { section: title })} />}
      showLabel={t('vin.assists.show')}
      hideLabel={t('vin.assists.hide')}
      defaultOpen={isShared}
    >
      <details className="mb-3 rounded-lg bg-[var(--color-border)]/30 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">💡 {t('vin.assists.explainer.title')}</summary>

        <div className="mt-2 space-y-2">
          <p className="m-0">{t('vin.assists.explainer.what')}</p>

          <p className="m-0">{t('vin.assists.explainer.why')}</p>

          <p className="m-0">{t('vin.assists.explainer.empty')}</p>

          <p className="m-0 text-[var(--color-muted)]">{t('vin.assists.explainer.caveat')}</p>
        </div>
      </details>

      <div className="space-y-4">
        {fields && hasDecoded && <VinAssists fields={fields} />}

        {hasBaseline && (
          <div className={hasDecoded ? 'border-t border-[var(--color-border)] pt-4' : undefined}>
            <VinEuBaseline year={euYear} />
          </div>
        )}
      </div>
    </VinToggleSection>
  )
}
