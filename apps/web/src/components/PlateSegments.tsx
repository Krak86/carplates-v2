import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizePlate, plateSeries } from '@carplates/shared'

import { splitPlate } from '@/components/PlateSegments.helpers'
import type { PlateSegmentId } from '@/components/PlateSegments.helpers'
import SegmentExplainer from '@/components/SegmentExplainer'
import { useRegionLabel } from '@/lib/region-label'
import type { SegmentColor } from '@/components/SegmentExplainer'

type Props = {
  plate: string
  region: string | null
}

const SEGMENT_COLOR: Readonly<Record<PlateSegmentId, SegmentColor>> = {
  region: 'sky',
  service: 'sky',
  series: 'amber',
  number: 'violet'
}

/**
 * The plate as colour-coded parts (region · number · series letters). Hover, focus or tap a part to read what it
 * means — the region name is filled in from the lookup. Renders nothing for plate shapes it can't split.
 */
export default function PlateSegments({ plate, region }: Props): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const segments = splitPlate(plate)
  if (!segments) return null

  const params = {
    region: regionLabel(region) ?? '—',
    service: t(`plate.seg.service.${plateSeries(normalizePlate(plate)) ?? 'diia'}`)
  }

  return (
    <SegmentExplainer
      hint={t('plate.seg.hint')}
      hintInline
      label={t('plate.seg.label')}
      segments={segments.map(s => ({
        id: s.id,
        text: s.text,
        color: SEGMENT_COLOR[s.id],
        title: t(`plate.seg.${s.id}.title`),
        positions: t('vin.seg.positions', { range: s.positions }),
        desc: t(`plate.seg.${s.id}.desc`, params)
      }))}
    />
  )
}
