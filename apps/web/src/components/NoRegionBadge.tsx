import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { noRegionInfoKey, plateRegionLabel } from '@/lib/plate-region'

type Props = {
  plate: string
}

/** For a plate without a region: why it has none ("Diia series (no region)" etc.), with a ❓ explaining it. */
export default function NoRegionBadge({ plate }: Props): ReactNode {
  const { t } = useTranslation()
  const label = plateRegionLabel(plate, t)

  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
        <InfoText text={t(`result.noRegion.${noRegionInfoKey(plate)}`)} />
      </InfoPopover>
    </span>
  )
}
