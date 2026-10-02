import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { countryFlag, resolveYear, splitVin, VIN_SEGMENT_POSITIONS } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import type { VinSegmentId } from '@/components/vin/types'
import { cn } from '@/lib/cn'

type Props = {
  vin: string
  fields: FieldMap
}

const SEGMENT_STYLE: Readonly<Record<VinSegmentId, string>> = {
  wmi: 'bg-sky-500/20 text-sky-700 ring-sky-500/50 dark:text-sky-300',
  vds: 'bg-violet-500/20 text-violet-700 ring-violet-500/50 dark:text-violet-300',
  check: 'bg-emerald-500/20 text-emerald-700 ring-emerald-500/50 dark:text-emerald-300',
  year: 'bg-amber-500/20 text-amber-700 ring-amber-500/50 dark:text-amber-300',
  plant: 'bg-rose-500/20 text-rose-700 ring-rose-500/50 dark:text-rose-300',
  serial: 'bg-slate-500/20 text-slate-700 ring-slate-500/50 dark:text-slate-300'
}

/**
 * The VIN as colour-coded segments (WMI / VDS / check digit / year / plant / serial). Hover, focus
 * or tap a segment to read what it means — year, make and plant are filled in from the decode.
 */
export default function VinSegments({ vin, fields }: Props): ReactNode {
  const { t } = useTranslation()
  const [active, setActive] = useState<VinSegmentId>('wmi')
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
    <div className="mb-4">
      <div className="mb-1 text-sm text-[var(--color-muted)]">{t('vin.seg.hint')}</div>

      <div role="group" aria-label={t('vin.seg.label')} className="flex flex-wrap gap-1 font-mono text-lg sm:text-xl">
        {segments.map(s => (
          <button
            key={s.id}
            type="button"
            aria-pressed={active === s.id}
            onMouseEnter={() => setActive(s.id)}
            onFocus={() => setActive(s.id)}
            onClick={() => setActive(s.id)}
            className={cn(
              'rounded-md px-1.5 py-0.5 font-semibold tracking-wider transition-shadow',
              SEGMENT_STYLE[s.id],
              active === s.id ? 'ring-2' : 'opacity-80 hover:opacity-100'
            )}
          >
            {s.text}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-2 rounded-md bg-[var(--color-border)]/30 px-3 py-2 text-sm">
        <span className="font-semibold">{t(`vin.seg.${active}.title`)}</span>
        <span className="text-[var(--color-muted)]">
          {' '}
          · {t('vin.seg.positions', { range: VIN_SEGMENT_POSITIONS[active] })}
        </span>
        <p className="mt-0.5">{t(`vin.seg.${active}.desc`, params)}</p>
      </div>
    </div>
  )
}
