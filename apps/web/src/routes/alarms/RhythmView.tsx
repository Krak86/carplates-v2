import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { AlarmsResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmStatsQuery, roadSafetyTimeQuery } from '@/lib/queries'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import RhythmChart from '@/routes/alarms/RhythmChart'
import { MIN_ALERTS_FOR_SHAPE, hourLabel, hoursFromBuckets, peakHours } from '@/routes/alarms/rhythm-helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

const peakText = (hours: readonly number[]): string => peakHours(hours).map(hourLabel).join(', ')

/**
 * "Rhythm": the live alarm map plus the 24-hour shape of today's alerts (our own recorder) next to the shape of road crashes
 * (Patrol Police, one year). Each series is a share of its own total; they are never combined. A siren is a threat, not a strike.
 */
export default function RhythmView({ data, isPending, isError }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const stats = useQuery(alarmStatsQuery())
  const time = useQuery(roadSafetyTimeQuery())

  const alerts = stats.data
  const crashHours = time.data ? hoursFromBuckets(time.data.hours) : null
  const hasAlerts = !!alerts?.recordingSince
  const hasCrashes = !!crashHours && crashHours.some(n => n > 0)
  const date = (iso: string): string =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'Europe/Kyiv' })

  return (
    <>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.rhythm.intro')}</p>

      <AlarmMapCard data={data} isPending={isPending} isError={isError} />

      <Card className="mb-6">
        <h2 className="mb-1 text-lg font-semibold">{t('alarms.rhythm.title')}</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.rhythm.hint')}</p>

        {(stats.isPending || time.isPending) && <StatsMapSkeleton />}

        {!stats.isPending && !time.isPending && (!hasAlerts || !hasCrashes) && (
          <p className="text-[var(--color-muted)]">
            {t(!hasAlerts ? 'alarms.rhythm.noAlerts' : 'alarms.rhythm.noCrashes')}
          </p>
        )}

        {alerts && hasAlerts && hasCrashes && (
          <>
            <RhythmChart alerts={alerts.byHour} crashes={crashHours} locale={locale} />

            <ul className="mt-3 grid gap-1 text-sm">
              {peakHours(alerts.byHour).length > 0 && (
                <li>{t('alarms.rhythm.peakAlerts', { hours: peakText(alerts.byHour), total: alerts.total })}</li>
              )}
              <li>{t('alarms.rhythm.peakCrashes', { hours: peakText(crashHours) })}</li>
            </ul>

            {alerts.total < MIN_ALERTS_FOR_SHAPE && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                {t('alarms.rhythm.fewAlerts', { count: MIN_ALERTS_FOR_SHAPE })}
              </p>
            )}

            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {t('alarms.rhythm.note', {
                since: alerts.recordingSince ? date(alerts.recordingSince) : '',
                year: time.data?.year ?? '',
                months: time.data?.period ?? ''
              })}
            </p>
          </>
        )}
      </Card>
    </>
  )
}
