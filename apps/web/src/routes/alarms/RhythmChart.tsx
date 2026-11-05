import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { hourLabel, hourShares } from '@/routes/alarms/rhythm-helpers'

type Props = {
  /** 24 counters by Kyiv hour of the alert start (today). */
  alerts: readonly number[]
  /** 24 crash counters by hour (one year). */
  crashes: readonly number[]
  locale: string
}

/**
 * Two series on one 24-hour axis, each as the share of its own total so a day of alerts and a year of crashes can be compared
 * in shape. Bars carry exact numbers in their title; the two are never combined into one score.
 */
export default function RhythmChart({ alerts, crashes, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const alertShare = hourShares(alerts)
  const crashShare = hourShares(crashes)
  const peak = Math.max(0.0001, ...alertShare, ...crashShare)
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const series = [
    {
      key: 'alerts',
      label: t('alarms.rhythm.alerts'),
      color: 'var(--chip-safety)',
      shares: alertShare,
      counts: alerts
    },
    {
      key: 'crashes',
      label: t('alarms.rhythm.crashes'),
      color: 'var(--color-primary)',
      shares: crashShare,
      counts: crashes
    }
  ] as const

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
        {series.map(s => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div
        role="img"
        aria-label={t('alarms.rhythm.chartLabel')}
        className="flex h-40 items-end gap-0.5 border-b border-[var(--color-border)]"
      >
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="flex h-full flex-1 items-end justify-center gap-px">
            {series.map(s => {
              const share = s.shares[hour] ?? 0
              return (
                <div
                  key={s.key}
                  className="w-full max-w-2 rounded-t-sm"
                  style={{
                    background: s.color,
                    height: `${(share / peak) * 100}%`,
                    minHeight: (s.counts[hour] ?? 0) > 0 ? 2 : 0
                  }}
                  title={`${hourLabel(hour)}:00, ${s.label}: ${s.counts[hour] ?? 0} (${percent.format(share)})`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted)]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  )
}
