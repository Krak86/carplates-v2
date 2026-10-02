import type { ReactNode } from 'react'
import type { SafetyStatsRow } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import { toIntlLocale } from '@/lib/intl'
import { bandForScore, barPercent, coveragePercent } from '@/routes/safety/helpers'

type Props = {
  rows: SafetyStatsRow[]
  /** Maps a row label to what is shown (e.g. a translated source name); defaults to the label itself. */
  formatLabel?: (label: string) => string
}

/** One horizontal bar per row, length and colour from the average crash score; rows with no rating show "—". */
export default function SafetyBarList({ rows, formatLabel }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  return (
    <ul className="space-y-1.5">
      {rows.map(row => (
        <li
          key={row.label}
          className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[9rem_1fr_auto]"
        >
          <span className="truncate" title={formatLabel?.(row.label) ?? row.label}>
            {formatLabel?.(row.label) ?? row.label}
          </span>

          <span className="h-3 overflow-hidden rounded-full bg-[var(--color-border)]/40">
            {row.avgScore != null && (
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${barPercent(row.avgScore)}%`,
                  background: CO2_BAND_COLOR[bandForScore(row.avgScore)]
                }}
              />
            )}
          </span>

          <span className="text-right whitespace-nowrap tabular-nums">
            {row.avgScore != null ? Math.round(row.avgScore) : '—'}{' '}
            <span className="text-xs text-[var(--color-muted)]">
              {t('fuel.cars', { count: numberFormat.format(row.n) })} · {Math.round(coveragePercent(row))}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
