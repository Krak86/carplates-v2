import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import SegmentExplainer from '@/components/SegmentExplainer'
import type { SegmentColor } from '@/components/SegmentExplainer'
import {
  countryFlag,
  countryName,
  isoFlag,
  resolveYear,
  splitVin,
  VIN_SEGMENT_POSITIONS
} from '@/components/vin/helpers'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'
import type { VinSegmentId } from '@/components/vin/types'

type Props = {
  vin: string
  fields: FieldMap
  fallback: VinFallback
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
export default function VinSegments({ vin, fields, fallback }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const segments = splitVin(vin)
  if (!segments) return null

  const textOf = (id: VinSegmentId): string => segments.find(s => s.id === id)?.text ?? ''
  const year = resolveYear(textOf('year'), fields.get('Model Year'))
  const nhtsaCountry = fields.get('Plant Country')
  const country = nhtsaCountry ?? (fallback.country ? countryName(fallback.country.value, i18n.language) : undefined)
  const flag = nhtsaCountry ? countryFlag(nhtsaCountry) : fallback.country ? isoFlag(fallback.country.value) : null
  // Values NHTSA lacked come from the VIN prefix — say so, so they aren't mistaken for a full decode.
  const approx = (text: string, derived: boolean): string =>
    derived ? `${text} (≈ ${t('vin.derived.wmi.label')})` : text
  const maker = fields.get('Manufacturer Name') ?? fields.get('Make') ?? fallback.make?.value
  const params: Record<string, string> = {
    make: fields.get('Make') ?? fallback.make?.value ?? '—',
    manufacturer: maker ? approx(maker, !fields.get('Manufacturer Name') && !fields.get('Make')) : '—',
    country: country ? approx(`${flag ? `${flag} ` : ''}${country}`, !nhtsaCountry) : '—',
    city: fields.get('Plant City') ?? '—',
    year: year ? String(year) : '—',
    descriptor: fields.get('Vehicle Descriptor') ?? textOf('vds')
  }
  const vdsKey = fields.get('Vehicle Descriptor') ? 'vin.seg.vds.desc' : 'vin.seg.vds.descRaw'

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
        desc: t(s.id === 'vds' ? vdsKey : `vin.seg.${s.id}.desc`, params)
      }))}
    />
  )
}
