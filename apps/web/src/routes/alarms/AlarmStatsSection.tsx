import type { ReactNode } from 'react'
import type { AlarmStatsEvent } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmStatsQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import { splitDuration } from '@/routes/alarms/history-helpers'

const TOP_REGIONS = 10

type BarsProps = { label: string; values: readonly { key: string; text: string; value: number }[] }

/** Plain CSS bars: a number next to every bar, so nothing depends on colour or hover. */
function Bars({ label, values }: BarsProps): ReactNode {
  const max = Math.max(1, ...values.map(v => v.value))
  return (
    <ul aria-label={label} className="grid gap-1 text-xs">
      {values.map(v => (
        <li key={v.key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2">
          <span className="truncate text-[var(--color-muted)]">{v.text}</span>
          <span
            aria-hidden
            className="h-3 rounded-sm bg-[var(--chip-safety)]"
            style={{ width: `${(v.value / max) * 100}%`, minWidth: v.value > 0 ? 2 : 0 }}
          />
          <span className="text-right tabular-nums">{v.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Today's alerts from our own recorder: count, longest / shortest, by hour and by oblast. It only covers the time since the
 * recorder started (`recordingSince`) and counts alerts on their Kyiv start day. A siren is a threat, never a count of attacks.
 */
export default function AlarmStatsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const stats = useQuery(alarmStatsQuery())
  const data = stats.data

  if (stats.isError) return null
  if (!data) return null

  const duration = (seconds: number): string => {
    const { hours, minutes } = splitDuration(seconds)
    return hours > 0 ? t('alarms.stats.hm', { hours, minutes }) : t('alarms.stats.m', { minutes })
  }
  const time = (iso: string): string =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })
  const date = (iso: string): string =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'Europe/Kyiv' })

  const eventCard = (title: string, e: AlarmStatsEvent | null): ReactNode => (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-muted)]">{title}</div>
      {e ? (
        <>
          <div className="mt-1 text-lg font-semibold tabular-nums">{duration(e.seconds)}</div>
          <div className="text-sm">{e.name}</div>
          <div className="text-xs text-[var(--color-muted)]">
            {localizeRegion(e.region, i18n.language)}, {time(e.startedAt)}
            {e.ongoing && ` (${t('alarms.stats.ongoing')})`}
          </div>
        </>
      ) : (
        <div className="mt-1 text-lg">-</div>
      )}
    </div>
  )

  const peak = Math.max(...data.byHour)
  const peakHours = peak > 0 ? data.byHour.flatMap((n, h) => (n === peak ? [h] : [])) : []
  const delta = data.previousTotal === null ? null : data.total - data.previousTotal

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">{t('alarms.stats.title')}</h2>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.stats.intro')}</p>

      {!data.recordingSince ? (
        <p className="text-[var(--color-muted)]">{t('alarms.stats.collecting')}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="text-xs text-[var(--color-muted)]">{t('alarms.stats.total')}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{data.total}</div>
              {delta !== null && (
                <div className="text-xs text-[var(--color-muted)]">
                  {t('alarms.stats.vsPrevious', { value: `${delta > 0 ? '+' : ''}${delta}` })}
                </div>
              )}
            </div>
            {eventCard(t('alarms.stats.longest'), data.longest)}
            {eventCard(t('alarms.stats.shortest'), data.shortest)}
          </div>

          {peakHours.length > 0 && (
            <p className="mt-3 text-sm">
              {t('alarms.stats.peakHour', { hours: peakHours.map(h => String(h).padStart(2, '0')).join(', ') })}
            </p>
          )}

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('alarms.stats.byHour')}</h3>
              <div
                role="img"
                aria-label={t('alarms.stats.byHour')}
                className="flex h-32 items-end gap-0.5 border-b border-[var(--color-border)]"
              >
                {data.byHour.map((n, h) => (
                  <div
                    key={h}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${String(h).padStart(2, '0')}:00 - ${n}`}
                  >
                    <div
                      className="w-full rounded-t-sm bg-[var(--chip-safety)]"
                      style={{ height: `${peak > 0 ? (n / peak) * 100 : 0}%`, minHeight: n > 0 ? 2 : 0 }}
                    />
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
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('alarms.stats.byRegion')}</h3>
              <Bars
                label={t('alarms.stats.byRegion')}
                values={data.byRegion.slice(0, TOP_REGIONS).map(r => ({
                  key: r.region,
                  text: localizeRegion(r.region, i18n.language),
                  value: r.count
                }))}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--color-muted)]">
            {t('alarms.stats.note', { since: date(data.recordingSince) })}
          </p>
        </>
      )}
    </Card>
  )
}
