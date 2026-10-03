import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { VinRegistry } from '@carplates/shared'

import RegistrationTimeline from '@/components/RegistrationTimeline'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  registry: VinRegistry
}

/** The state-registry timeline for this VIN — collapsed by default, like the plate view's history. */
export default function VinRegistryHistory({ registry }: Props): ReactNode {
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
      title={t('vin.registryTitle')}
      actions={<ShareButton section="history" label={t('share.button', { section: t('vin.registryTitle') })} />}
    >
      <RegistrationTimeline actions={registry.actions} />
    </VinToggleSection>
  )
}
