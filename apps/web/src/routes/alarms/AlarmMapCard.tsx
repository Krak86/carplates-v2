import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AlarmsResponse } from '@carplates/shared'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { ALARM_FILL, levelFill } from '@/routes/alarms/helpers'
import type { AlarmMapOverlayContext } from '@/routes/alarms/AlarmMap'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import ExternalLink from '@/components/ExternalLink'
import ShareButton from '@/components/ShareButton'

const AlarmMap = lazy(() => import('@/routes/alarms/AlarmMap'))

const LEGEND = [
  { key: 'red', fill: levelFill('Red', false), label: 'alarms.legend.red' },
  { key: 'yellow', fill: levelFill('Yellow', false), label: 'alarms.legend.yellow' },
  { key: 'none', fill: ALARM_FILL.none, label: 'alarms.status.none' }
] as const

type Props = {
  /** The route-level `alarmsQuery` result, shared by every view so tab switches never refetch. */
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
  /** Extra SVG above the alarm fills (never recolours them). */
  overlay?: (ctx: AlarmMapOverlayContext) => ReactNode
  /** Makes oblasts selectable; selection only outlines, never recolours. */
  onSelectRegion?: (region: string) => void
  selectedRegion?: string | null
  /** Shown inside the card under the legend (the active list in the classic view). */
  children?: ReactNode
}

/**
 * The live alarm map shared by every `/alarms` view: same red / yellow / none fills, same fail-closed rule
 * (503 = dimmed base map and "no data", never a calm map), plus an optional overlay for the view's own data.
 */
export default function AlarmMapCard({
  data,
  isPending,
  isError,
  overlay,
  onSelectRegion,
  selectedRegion,
  children
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [showLabels, setShowLabels] = useState(true)
  const count = data?.regions.length ?? 0
  const time = data
    ? new Date(data.fetchedAt).toLocaleTimeString(toIntlLocale(i18n.language), { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      {isPending && <StatsMapSkeleton />}

      {/* 503 (no or stale data) is an error here: say "no data", never draw a calm map. */}
      {/* The base map still draws, dimmed and without any alert colour, so it cannot read as "calm". */}
      {isError && (
        <Card className="mb-6">
          <p className="mb-3 text-[var(--color-muted)]">{t('alarms.noData')}</p>
          <div className="opacity-40 grayscale">
            <LoadErrorBoundary compact>
              <Suspense fallback={<StatsMapSkeleton />}>
                <AlarmMap
                  regions={[]}
                  showLabels={showLabels}
                  overlay={overlay}
                  onSelectRegion={onSelectRegion}
                  selectedRegion={selectedRegion}
                />
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </Card>
      )}

      {data && (
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">{t('alarms.count', { count })}</span>
            {time && <span className="text-[var(--color-muted)]">{t('alarms.updated', { time })}</span>}
            <span className="text-xs text-[var(--color-muted)]">{t('alarms.refresh')}</span>
            <span className="ml-auto">
              <ShareButton section="map" label={t('alarms.share')} />
            </span>
            <button
              type="button"
              onClick={() => setShowLabels(v => !v)}
              className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs"
            >
              {t(showLabels ? 'alarms.hideRegions' : 'alarms.showRegions')}
            </button>
          </div>

          <p className="mb-3 text-xs text-[var(--color-muted)]">{t('alarms.source')}</p>

          <LoadErrorBoundary compact>
            <Suspense fallback={<StatsMapSkeleton />}>
              <AlarmMap
                regions={data.regions}
                showLabels={showLabels}
                overlay={overlay}
                onSelectRegion={onSelectRegion}
                selectedRegion={selectedRegion}
              />
            </Suspense>
          </LoadErrorBoundary>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
            {LEGEND.map(item => (
              <li key={item.key} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-sm border border-[var(--color-border)]"
                  style={{ background: item.fill }}
                />
                {t(item.label)}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {t('alarms.movement')}{' '}
            <ExternalLink
              href="https://alerts.in.ua"
              className="underline underline-offset-2 hover:text-[var(--color-fg)]"
            >
              {t('alarms.movementLink')}
            </ExternalLink>
          </p>

          {children}
        </Card>
      )}
    </>
  )
}
