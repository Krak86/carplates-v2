import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import { regionFlagLargeUrl } from '@/lib/region-flags'

type Props = {
  /** Region name as in the registry (`REGIONS`); nothing renders for a region without a flag. */
  region: string | null | undefined
  /** The region in the UI language, shown as the panel title. */
  label: string | null | undefined
}

/** A "?" that shows the region's flag large and sharp on hover or tap (the chip's own flag is a small thumbnail). */
export default function RegionFlagInfo({ region, label }: Props): ReactNode {
  const { t } = useTranslation()
  const src = regionFlagLargeUrl(region)
  if (!src) return null

  return (
    <InfoPopover label={t('region.flag.label')} title={label ?? t('region.flag.label')}>
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        className="w-full rounded shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
      />
    </InfoPopover>
  )
}
