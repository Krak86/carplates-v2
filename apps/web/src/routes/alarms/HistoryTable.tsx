import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import { localizeRegion } from '@/lib/region-label'
import { splitDuration } from '@/routes/alarms/history-helpers'
import type { HistoryRow } from '@/routes/alarms/history-helpers'

type Props = {
  rows: readonly HistoryRow[]
  /** The crash columns stay empty when the DTP year did not load. */
  hasCrashes: boolean
}

/** Per region: alerts, total time and longest alert, next to crashes and deaths. Rows arrive sorted by time under alert. */
export default function HistoryTable({ rows, hasCrashes }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const number = (value: number | null): string => (value === null ? '-' : numberFormat.format(value))
  const hours = (seconds: number): string =>
    t('alarms.history.hours', { count: numberFormat.format(Math.round(seconds / 3600)) })
  const duration = (seconds: number): string => {
    const { hours: h, minutes } = splitDuration(seconds)
    return t('alarms.history.duration', { hours: numberFormat.format(h), minutes })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">{t('alarms.history.table.title')}</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
            <th scope="col" className="py-1.5 pr-2 font-medium">
              {t('alarms.history.table.region')}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              {t('alarms.history.table.alerts')}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              {t('alarms.history.table.time')}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              {t('alarms.history.table.longest')}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              {t('alarms.history.table.crashes')}
            </th>
            <th scope="col" className="py-1.5 pl-2 text-right font-medium">
              {t('alarms.history.table.deaths')}
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(r => (
            <tr key={r.region} className="border-b border-[var(--color-border)]/50">
              <th scope="row" className="py-1 pr-2 text-left font-normal">
                {localizeRegion(r.region, i18n.language)}
              </th>
              <td className="px-2 py-1 text-right">{number(r.alerts)}</td>
              <td className="px-2 py-1 text-right">{hours(r.seconds)}</td>
              <td className="px-2 py-1 text-right">{duration(r.longestSeconds)}</td>
              <td className="px-2 py-1 text-right text-[var(--color-muted)]">{hasCrashes ? number(r.crashes) : '-'}</td>
              <td className="py-1 pl-2 text-right text-[var(--color-muted)]">{hasCrashes ? number(r.deaths) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
