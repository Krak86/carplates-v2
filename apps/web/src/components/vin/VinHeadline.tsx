import type { ReactNode } from 'react'

import { resolveYear, splitVin } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'

type Props = {
  vin: string
  fields: FieldMap
}

/** "KIA Sportage 2017" plus trim / vehicle type / body chips. */
export default function VinHeadline({ vin, fields }: Props): ReactNode {
  const yearChar = splitVin(vin)?.find(s => s.id === 'year')?.text
  const year = fields.get('Model Year') ?? (yearChar ? resolveYear(yearChar, undefined) : null)
  const title = [fields.get('Make'), fields.get('Model'), year].filter(Boolean).join(' ')
  const chips = [fields.get('Trim'), fields.get('Series'), fields.get('Body Class'), fields.get('Vehicle Type')].filter(
    (c): c is string => !!c
  )
  if (!title) return null

  return (
    <div>
      <div className="text-2xl leading-tight font-bold">{title}</div>

      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className="rounded-full bg-[var(--color-border)]/50 px-2.5 py-0.5 text-sm">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
