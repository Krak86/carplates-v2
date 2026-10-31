import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { VinRegistry } from '@carplates/shared'

import RegistrationTimeline from '@/components/RegistrationTimeline'
import SectionCount from '@/components/SectionCount'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import VinSince2021Note from '@/components/vin/VinSince2021Note'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  registry: VinRegistry
  /** Looks up Ukrainian auction lots of this VIN for the timeline. */
  vin: string
}

/** The state-registry timeline for this VIN — collapsed by default, like the plate view's history. */
export default function VinRegistryHistory({ registry, vin }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'history'
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isShared && ref.current) scrollElementIntoView(ref.current)
  }, [isShared])

  return (
    <VinToggleSection
      ref={ref}
      bordered={false}
      icon="⚙️"
      defaultOpen={isShared}
      showLabel={t('result.historyShow')}
      hideLabel={t('result.historyHide')}
      title={
        <>
          {t('vin.registryTitle')} <SectionCount count={registry.actions.length} />
        </>
      }
      info={<SectionInfo section="history" title={t('vin.registryTitle')} />}
      actions={<ShareButton section="history" label={t('share.button', { section: t('vin.registryTitle') })} />}
    >
      <RegistrationTimeline actions={registry.actions} auctionKeys={{ plate: null, vin }} />

      <VinSince2021Note />
    </VinToggleSection>
  )
}
