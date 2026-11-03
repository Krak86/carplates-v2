import type { ReactNode } from 'react'
import type { StatsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import RegionFlag from '@/components/RegionFlag'
import { toIntlLocale } from '@/lib/intl'
import { useRegionLabel } from '@/lib/region-label'
import { dimensionRows } from '@/routes/stats/helpers'
import type { StatsMetric } from '@/routes/stats/types'
import { topRegionShares } from '@/routes/stats/RegionTopStrip.helpers'

type Props = {
  stats: StatsResponse
  metric: StatsMetric
}

/** The three biggest regions of the chosen metric under the map: rank, name, share of the country and a bar scaled to the leader. */
export default function RegionTopStrip({ stats, metric }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const percentFormat = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const top = topRegionShares(dimensionRows(stats, 'region').map(r => ({ label: r.label, value: r[metric] })))
  const leader = top[0]?.share ?? 0
  if (top.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">{t('stats.regionsTop.title')}</h3>

      <ol className="grid gap-3 sm:grid-cols-3">
        {top.map((r, i) => (
          <li
            key={r.region}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-black"
                style={{ backgroundColor: `var(--age-${i})` }}
              >
                {i + 1}
              </span>

              <RegionFlag region={r.region} />

              <span className="min-w-0 truncate font-medium">{regionLabel(r.region)}</span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]/40" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(r.share / leader) * 100}%`, backgroundColor: `var(--age-${i})` }}
              />
            </div>

            <p className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
              <span className="font-medium">{percentFormat.format(r.share)}</span>
              <span className="text-xs text-[var(--color-muted)]">{numberFormat.format(r.value)}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
