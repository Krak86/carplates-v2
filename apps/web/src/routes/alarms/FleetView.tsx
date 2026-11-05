import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ALARM_HISTORY_SOURCE } from '@carplates/shared'
import type { AlarmsResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmHistoryQuery, regionFacetStatsQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import FleetScatter from '@/routes/alarms/FleetScatter'
import { DEFAULT_FLEET_METRIC, FLEET_METRICS, scatterPoints } from '@/routes/alarms/fleet-helpers'
import type { FleetMetric } from '@/routes/alarms/fleet-helpers'
import { useChoiceParam, useRegionParam } from '@/routes/alarms/view-params'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

/**
 * "Alerts vs fleet": the live alarm map plus a scatter of last year's hours under alert (official data) against the share of
 * electric or diesel cars in each region's fleet. Correlation, not cause; no trend line, no score, shares not per-capita.
 */
export default function FleetView({ data, isPending, isError }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [metric, setMetric] = useChoiceParam<FleetMetric>('fuel', FLEET_METRICS, DEFAULT_FLEET_METRIC)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useRegionParam()
  const history = useQuery(alarmHistoryQuery())
  const facets = useQuery(regionFacetStatsQuery())

  const source = history.data?.sources.find(s => s.source === DEFAULT_ALARM_HISTORY_SOURCE)
  const alerts = source?.regions
  // The history year can still be running, so say which days the hours cover.
  const date = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const points = alerts && facets.data ? scatterPoints(alerts, facets.data.regions, metric) : []
  const active = hovered ?? pinned
  const isLoading = history.isPending || facets.isPending

  return (
    <>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.fleet.intro')}</p>

      <AlarmMapCard
        data={data}
        isPending={isPending}
        isError={isError}
        onSelectRegion={setPinned}
        selectedRegion={active}
      />

      <Card className="mb-6">
        <h2 className="mb-1 text-lg font-semibold">{t('alarms.fleet.title')}</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.fleet.hint')}</p>
        <div className="mb-3">
          <SegmentedTabs
            values={FLEET_METRICS}
            value={metric}
            onChange={setMetric}
            label={m => t(`alarms.cars.${m}`)}
          />
        </div>

        {isLoading && <StatsMapSkeleton />}
        {!isLoading && points.length === 0 && <p className="text-[var(--color-muted)]">{t('alarms.fleet.empty')}</p>}
        {points.length > 0 && (
          <>
            <FleetScatter
              points={points}
              xLabel={t('alarms.fleet.x', { fuel: t(`alarms.cars.${metric}`) })}
              yLabel={t('alarms.cars.hours')}
              locale={locale}
              active={active}
              onActive={setHovered}
              onPick={r => setPinned(pinned === r ? null : r)}
            />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {active ? (localizeRegion(active, i18n.language) ?? active) : t('alarms.fleet.pick')}
            </p>
          </>
        )}

        <p className="mt-4 rounded-md border border-[var(--color-border)] p-3 text-sm">
          <strong>{t('alarms.fleet.caveatTitle')}</strong> {t('alarms.fleet.caveat')}
        </p>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          {t('alarms.fleet.note', { from: date(source?.firstDay), to: date(source?.lastDay) })}
        </p>
      </Card>
    </>
  )
}
