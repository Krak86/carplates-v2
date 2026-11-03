import type { ReactNode } from 'react'
import type { WantedStatsRow } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import ColumnChart from '@/components/charts/ColumnChart'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  rows: WantedStatsRow[]
}

/** Stolen (columns) and found (line) per theft year; each tooltip carries both counts. */
export default function WantedYearChart({ rows }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const columns = rows.map(r => ({
    key: r.label,
    label: r.label,
    value: r.stolen,
    secondary: r.found,
    title: `${r.label}: ${t('wanted.stats.col.stolen')} ${numberFormat.format(r.stolen)} · ${t('wanted.stats.col.found')} ${numberFormat.format(r.found)}`
  }))

  return (
    <div>
      <ColumnChart
        columns={columns}
        ariaLabel={t('wanted.stats.byYear')}
        formatTick={v => compact.format(v)}
        labelEvery={rows.length > 12 ? 2 : 1}
        height={200}
      />

      <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-sm" style={{ backgroundColor: 'var(--age-0)' }} />
          {t('wanted.stats.col.stolen')}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--age-3)' }} />
          {t('wanted.stats.col.found')}
        </span>
      </p>
    </div>
  )
}
