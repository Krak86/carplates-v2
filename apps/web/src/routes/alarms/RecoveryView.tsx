import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DREAM_SITE_URL } from '@carplates/shared'
import type { AlarmsResponse, DreamSummaryResponse } from '@carplates/shared'

import InfoPopover from '@/components/InfoPopover'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { dreamSummaryQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import type { AlarmMapOverlayContext } from '@/routes/alarms/AlarmMap'
import {
  DEFAULT_RECOVERY_METRIC,
  RECOVERY_METRICS,
  metricValue,
  recoveryMarkers,
  sharePercent
} from '@/routes/alarms/recovery-helpers'
import { useChoiceParam, useRegionParam } from '@/routes/alarms/view-params'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

type Counts = Record<string, number>

/** Green-teal, far from the alarm red / yellow so a marker never reads as an alert. */
const MARKER_FILL = 'oklch(0.58 0.13 165)'

/**
 * "Recovery": the live alarm map (same fills) with DREAM recovery projects (dream.gov.ua) as one marker per region, sized by the
 * number of projects or their committed funding. Recovery data is separate from alerts: no combined score, never recolours the fills.
 * A DREAM error or 404 hides the numbers, not the map.
 */
export default function RecoveryView({ data, isPending, isError }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const uahFormat = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    notation: 'compact',
    maximumFractionDigits: 1
  })
  const [metric, setMetric] = useChoiceParam('mode', RECOVERY_METRICS, DEFAULT_RECOVERY_METRIC)
  const [region, setRegion] = useRegionParam()
  const summary = useQuery(dreamSummaryQuery())

  const rows = summary.data?.regions ?? []
  const selected = region ? (rows.find(r => r.region === region) ?? null) : null

  const overlay = ({ centers, zoom }: AlarmMapOverlayContext): ReactNode => (
    <g aria-hidden>
      {recoveryMarkers(rows, centers, metric).map(m => (
        <circle
          key={m.region}
          cx={m.x}
          cy={m.y}
          r={m.r / Math.sqrt(zoom)}
          fill={MARKER_FILL}
          fillOpacity={0.6}
          stroke="white"
          strokeWidth={0.6 / zoom}
          pointerEvents="none"
        />
      ))}
    </g>
  )

  const breakdown = (title: string, counts: Counts, key: 'status' | 'type'): ReactNode => (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <dl className="text-sm">
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => (
            <div key={name} className="flex justify-between gap-3 border-b border-[var(--color-border)]/50 py-1">
              <dt className="text-[var(--color-muted)]">
                {t(`alarms.recovery.${key}.${name}`, { defaultValue: name })}
              </dt>
              <dd className="font-medium">{numberFormat.format(count)}</dd>
            </div>
          ))}
      </dl>
    </div>
  )

  const card = (title: string, stats: DreamSummaryResponse['total'], share: number | null): ReactNode => (
    <Card className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--color-muted)]">{t('alarms.recovery.projects')}</dt>
          <dd className="text-xl font-semibold">{numberFormat.format(stats.projects)}</dd>
          {share !== null && (
            <dd className="text-xs text-[var(--color-muted)]">{t('alarms.recovery.share', { percent: share })}</dd>
          )}
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">{t('alarms.recovery.funds')}</dt>
          <dd className="text-xl font-semibold">{uahFormat.format(stats.committedUah)}</dd>
        </div>
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        {breakdown(t('alarms.recovery.byStatus'), stats.byStatus, 'status')}
        {breakdown(t('alarms.recovery.byType'), stats.byType, 'type')}
      </div>
    </Card>
  )

  return (
    <>
      <div className="mb-3 flex items-start gap-1.5 text-sm text-[var(--color-muted)]">
        <p>{t('alarms.recovery.intro')}</p>
        <InfoPopover label={t('alarms.recovery.about.title')} title={t('alarms.recovery.about.title')}>
          <p className="mb-2">{t('alarms.recovery.about.what')}</p>
          <p className="mb-2">{t('alarms.recovery.about.who')}</p>
          <p>{t('alarms.recovery.about.data')}</p>
        </InfoPopover>
      </div>
      <div className="mb-3">
        <SegmentedTabs
          values={RECOVERY_METRICS}
          value={metric}
          onChange={setMetric}
          label={m => t(`alarms.recovery.metric.${m}`)}
        />
      </div>

      <AlarmMapCard
        data={data}
        isPending={isPending}
        isError={isError}
        overlay={overlay}
        onSelectRegion={setRegion}
        selectedRegion={region}
      />

      {summary.data ? (
        <>
          {selected
            ? card(
                localizeRegion(selected.region, i18n.language) ?? selected.region,
                selected,
                sharePercent(
                  metricValue(selected, metric),
                  metric === 'funds' ? summary.data.total.committedUah : summary.data.total.projects
                )
              )
            : card(t('alarms.recovery.country'), summary.data.total, null)}
          {!selected && <p className="mb-6 text-sm text-[var(--color-muted)]">{t('alarms.recovery.pick')}</p>}
          <p className="mb-2 text-xs text-[var(--color-muted)]">
            {t('alarms.recovery.updated', { date: new Date(summary.data.updatedAt).toLocaleDateString(locale) })}
            {summary.data.unlocated ? ` ${t('alarms.recovery.unlocated', { count: summary.data.unlocated })}` : ''}
          </p>
        </>
      ) : (
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          {summary.isPending ? t('alarms.recovery.loading') : t('alarms.recovery.noData')}
        </p>
      )}

      <p className="mb-6 text-xs text-[var(--color-muted)]">
        {t('alarms.recovery.note')}{' '}
        <a href={DREAM_SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
          dream.gov.ua
        </a>
      </p>
    </>
  )
}
