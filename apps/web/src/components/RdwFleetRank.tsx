import type { ReactNode } from 'react'
import { percentileOf, type DistributionMetric, type RdwSpecs } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { hpPerTonne } from '@/components/RdwInsights.helpers'
import { appliesToFuel, type OwnFigures } from '@/components/RdwSpecs.helpers'
import { statsDistributionQuery } from '@/lib/queries'

type Props = {
  specs: RdwSpecs
  own?: OwnFigures
  fuel?: string | null
  kw: number
}

type Rank = { metric: DistributionMetric; key: 'power' | 'hpPerTonne' | 'displacement'; value: number }

/** Below this many cars a fleet share is noise (a freshly seeded or filtered database). */
const MIN_FLEET = 1000

/**
 * "More powerful than 78 % of Ukrainian passenger cars": where this car's power, power-to-weight and engine size sit
 * in the registry's fleet histograms. Shares come from `/api/stats/distribution` (rebuilt by `db:refresh-spec-stats`);
 * the bar is drawn for the share and the number is rounded, never "78.3".
 */
export default function RdwFleetRank({ specs, own, fuel, kw }: Props): ReactNode {
  const { t } = useTranslation()
  const { data } = useQuery(statsDistributionQuery())
  if (!data) return null

  const unladen = own?.massKg ?? specs.massKg?.median ?? null
  const cc = own?.displacementCc ?? specs.displacementCc?.median ?? null
  const ranks: Rank[] = [{ metric: 'power_kw', key: 'power', value: kw }]
  if (unladen) ranks.push({ metric: 'hp_per_tonne', key: 'hpPerTonne', value: hpPerTonne(kw, unladen) })
  if (cc && appliesToFuel('combustion', fuel)) ranks.push({ metric: 'displacement_cc', key: 'displacement', value: cc })

  const rows = ranks.flatMap(rank => {
    const histogram = data[rank.metric]
    const fleet = histogram.buckets.reduce((sum, [, n]) => sum + n, 0)
    const share = fleet >= MIN_FLEET ? percentileOf(histogram, rank.value) : null
    return share === null ? [] : [{ ...rank, pct: Math.round(share * 100) }]
  })
  if (rows.length === 0) return null

  return (
    <div className="mt-3 space-y-1.5">
      {rows.map(row => (
        <div key={row.key}>
          <p className="text-sm">{t(`rdw.perf.rank.${row.key}`, { pct: row.pct })}</p>
          <div
            role="img"
            aria-label={t(`rdw.perf.rank.${row.key}`, { pct: row.pct })}
            className="relative h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
          >
            <span className="absolute inset-y-0 left-0 bg-[var(--color-primary)]" style={{ width: `${row.pct}%` }} />
          </div>
        </div>
      ))}

      <p className="text-xs text-[var(--color-muted)]">{t('rdw.perf.rank.note')}</p>
    </div>
  )
}
