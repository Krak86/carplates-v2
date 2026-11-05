import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ALARM_HISTORY_SOURCE, brandLogoUrl } from '@carplates/shared'
import type { AlarmRegion } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmHistoryQuery, roadSafetyRegionsQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import { statusOf } from '@/routes/alarms/helpers'
import type { RegionFleetSummary } from '@/routes/alarms/cars-helpers'
import { percent } from '@/routes/stats/StatsMap.helpers'

type Props = {
  /** Plate-region name (`REGIONS`). */
  region: string
  /** Live alerts, or undefined while the feed is down (the status line then says "no data", never "no alert"). */
  alerts: readonly AlarmRegion[] | undefined
  fleet: RegionFleetSummary | null
}

/**
 * One region: live alert status, current fleet, last year's time under alert and road crashes.
 * Honesty rules of the history section apply: a siren is a threat, official data only, no combined score.
 */
export default function RegionCard({ region, alerts, fleet }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const history = useQuery(alarmHistoryQuery())
  const crashes = useQuery({ ...roadSafetyRegionsQuery(history.data?.year), enabled: !!history.data })

  const own = history.data?.sources
    .find(s => s.source === DEFAULT_ALARM_HISTORY_SOURCE)
    ?.regions.find(r => r.region === region)
  // keepPreviousData: never mix another year's crashes with this year's alerts.
  const crash =
    crashes.data?.year === history.data?.year ? crashes.data?.regions.find(r => r.region === region) : undefined
  const share = (n: number): string => percent(n, fleet?.fleet ?? 0, locale)

  const row = (label: string, value: ReactNode): ReactNode => (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)]/50 py-1 text-sm last:border-0">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">{localizeRegion(region, i18n.language) ?? region}</h2>
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        {alerts ? t(`alarms.status.${statusOf(alerts, region)}`) : t('alarms.noData')}
      </p>

      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t('alarms.cars.fleetTitle')}</h3>
          {fleet ? (
            <dl>
              {row(t('alarms.cars.fleet'), numberFormat.format(fleet.fleet))}
              {fleet.brands.length > 0 &&
                row(
                  t('alarms.cars.topBrands'),
                  <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    {fleet.brands.map(b => {
                      const logo = brandLogoUrl(b.brand)
                      return (
                        <span key={b.brand} className="inline-flex items-center gap-1">
                          {logo && (
                            <img
                              src={logo}
                              alt=""
                              className="size-5 rounded bg-white object-contain p-0.5"
                              loading="lazy"
                            />
                          )}
                          {b.brand} {share(b.n)}
                        </span>
                      )
                    })}
                  </span>
                )}
              {fleet.topModel && row(t('alarms.cars.topModel'), `${fleet.topModel.value} ${share(fleet.topModel.n)}`)}
              {row(t('alarms.cars.electric'), share(fleet.electric))}
              {row(t('alarms.cars.hybrid'), share(fleet.hybrid))}
              {row(t('alarms.cars.diesel'), share(fleet.diesel))}
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{t('stats.map.noData')}</p>
          )}
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold">
            {t('alarms.cars.yearTitle', { year: history.data?.year ?? '' })}
          </h3>
          {own || crash ? (
            <dl>
              {own && row(t('alarms.cars.alerts'), numberFormat.format(own.alerts))}
              {own && row(t('alarms.cars.hours'), numberFormat.format(Math.round(own.seconds / 3600)))}
              {crash && row(t('alarms.cars.crashes'), numberFormat.format(crash.crashes))}
              {crash && row(t('alarms.cars.deaths'), numberFormat.format(crash.deaths))}
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{t('alarms.cars.noYear')}</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-muted)]">{t('alarms.cars.note')}</p>
    </Card>
  )
}
