import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { hasAssists } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import VinAssists from '@/components/vin/VinAssists'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  /** Decoded NHTSA fields; null while the VIN decode is missing or loading. */
  fields: FieldMap | null
}

/**
 * Collapsed "Safety & driver aids" section on the plate card (shareable via `?section=assists`). Renders nothing when the
 * decode lists no assist, so EU / pre-2015 VINs show no empty block.
 */
export default function DriverAssistSection({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'assists'
  const sectionRef = useRef<HTMLDivElement>(null)
  const ready = !!fields && hasAssists(fields)

  useEffect(() => {
    if (isShared && ready && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, ready])

  if (!fields || !ready) return null

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

      <VinAssists fields={fields} />
    </VinToggleSection>
  )
}
