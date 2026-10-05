import type { ReactNode } from 'react'

import VinDerivedChip from '@/components/vin/VinDerivedChip'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
  fallback: VinFallback
}

/** "KIA Sportage 2017" plus trim / vehicle type / body chips. Values NHTSA lacked are filled from `fallback` and tagged. */
export default function VinHeadline({ fields, fallback }: Props): ReactNode {
  const parts = [
    { key: 'make', text: fields.get('Make'), derived: fallback.make },
    { key: 'model', text: fields.get('Model'), derived: fallback.model },
    { key: 'year', text: fields.get('Model Year'), derived: fallback.year }
  ].flatMap(p => {
    const text = p.text ?? (p.derived ? String(p.derived.value) : undefined)
    return text ? [{ key: p.key, text, source: p.text ? undefined : p.derived?.source }] : []
  })
  const chips = [fields.get('Trim'), fields.get('Series'), fields.get('Body Class'), fields.get('Vehicle Type')].filter(
    (c): c is string => !!c
  )
  if (parts.length === 0) return null

  // One tag per distinct source — repeating it after every word is noise.
  const tagAfter = new Map<string, string>()
  for (const p of parts) if (p.source) tagAfter.set(p.source, p.key)

  return (
    <div>
      <div className="text-2xl leading-tight font-bold">
        {parts.map(p => (
          <span key={p.key}>
            {p.text}
            {p.source && tagAfter.get(p.source) === p.key && <VinDerivedChip source={p.source} />}{' '}
          </span>
        ))}
      </div>

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
