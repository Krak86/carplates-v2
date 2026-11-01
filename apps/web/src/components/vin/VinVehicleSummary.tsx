import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import VinDerivedChip from '@/components/vin/VinDerivedChip'
import { vehicleParts } from '@/components/vin/helpers'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
  fallback: VinFallback
}

/**
 * Temporary summary above the VIN card: the make / model / year the page would otherwise show only under the tabs. A copy for
 * orientation, nothing is moved - the decoded fields stay exactly as they are. Renders nothing when no part is known.
 */
export default function VinVehicleSummary({ fields, fallback }: Props): ReactNode {
  const { t } = useTranslation()
  const parts = vehicleParts(fields, fallback)
  if (parts.length === 0) return null

  // One tag per distinct source, after the last word it covers.
  const tagAfter = new Map<string, string>()
  for (const p of parts) if (p.source) tagAfter.set(p.source, p.key)
  const derived = parts.some(p => p.source)

  return (
    <div className="space-y-2 px-0.5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-[var(--color-muted)]">{t('otherSources.vehicle')}</dt>
        <dd className="font-semibold">
          {parts.map(p => (
            <span key={p.key}>
              {p.text}
              {p.source && tagAfter.get(p.source) === p.key && <VinDerivedChip source={p.source} />}{' '}
            </span>
          ))}
        </dd>
      </dl>
      <p className="text-sm text-[var(--color-muted)]">{t(derived ? 'vin.summary.noteDerived' : 'vin.summary.note')}</p>
    </div>
  )
}
