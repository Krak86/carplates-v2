import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import SegmentExplainer from '@/components/SegmentExplainer'
import type { SegmentColor } from '@/components/SegmentExplainer'
import { countryFlag, resolveYear, splitVin, VIN_SEGMENT_POSITIONS } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import type { VinSegmentId } from '@/components/vin/types'

type Props = {
  vin: string
  fields: FieldMap
}

const SEGMENT_COLOR: Readonly<Record<VinSegmentId, SegmentColor>> = {
  wmi: 'sky',
  vds: 'violet',
  check: 'emerald',
  year: 'amber',
  plant: 'rose',
  serial: 'slate'
}

/**
 * The VIN as colour-coded segments (WMI / VDS / check digit / year / plant / serial). Hover, focus
 * or tap a segment to read what it means — year, make and plant are filled in from the decode.
 */
export default function VinSegments({ vin, fields }: Props): ReactNode {
  const { t } = useTranslation()
  const segments = splitVin(vin)
  if (!segments) return null

  const textOf = (id: VinSegmentId): string => segments.find(s => s.id === id)?.text ?? ''
  const year = resolveYear(textOf('year'), fields.get('Model Year'))
  const country = fields.get('Plant Country')
  const flag = countryFlag(country)
  const params: Record<string, string> = {
    make: fields.get('Make') ?? '—',
    manufacturer: fields.get('Manufacturer Name') ?? '—',
    country: country ? `${flag ? `${flag} ` : ''}${country}` : '—',
    city: fields.get('Plant City') ?? '—',
    year: year ? String(year) : '—',
    descriptor: fields.get('Vehicle Descriptor') ?? textOf('vds')
  }

  return (
    <SegmentExplainer
      hint={t('vin.seg.hint')}
      label={t('vin.seg.label')}
      segments={segments.map(s => ({
        id: s.id,
        text: s.text,
        color: SEGMENT_COLOR[s.id],
        title: t(`vin.seg.${s.id}.title`),
        positions: t('vin.seg.positions', { range: VIN_SEGMENT_POSITIONS[s.id] }),
        desc: t(`vin.seg.${s.id}.desc`, params)
      }))}
    />
  )
}
