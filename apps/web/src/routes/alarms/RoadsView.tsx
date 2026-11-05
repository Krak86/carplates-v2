import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { HAZARD_KINDS } from '@carplates/shared'
import type { AlarmsResponse, HazardKind } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyHazardsQuery, roadSafetyRegionsQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import type { AlarmMapOverlayContext } from '@/routes/alarms/AlarmMap'
import { hazardDots, regionRoads } from '@/routes/alarms/roads-helpers'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

const DEFAULT_KIND: HazardKind = 'hazard'
/** Neutral blue, far from the alarm red / yellow so a dot never reads as an alert. */
const DOT_FILL = 'oklch(0.45 0.15 260)'

/**
 * "Roads": the live alarm map (same fills) with the Infrastructure Restoration Agency's hazardous road sections as dots and,
 * for the clicked region, the year's road deaths. Road data is official and separate from alerts; no combined score.
 */
export default function RoadsView({ data, isPending, isError }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const [kind, setKind] = useState<HazardKind>(DEFAULT_KIND)
  const [region, setRegion] = useState<string | null>(null)
  const hazards = useQuery(roadSafetyHazardsQuery({ kind }))
  const regions = useQuery(roadSafetyRegionsQuery())

  const list = hazards.data?.hazards
  const roads = region ? regionRoads(region, regions.data?.regions, list) : null

  const overlay = ({ project, zoom }: AlarmMapOverlayContext): ReactNode => (
    <g aria-hidden>
      {hazardDots(list ?? [], project).map(dot => (
        <circle
          key={dot.key}
          cx={dot.x}
          cy={dot.y}
          r={dot.r / Math.sqrt(zoom)}
          fill={DOT_FILL}
          fillOpacity={0.7}
          stroke="white"
          strokeWidth={0.5 / zoom}
          pointerEvents="none"
        />
      ))}
    </g>
  )

  return (
    <>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.roads.intro')}</p>
      <div className="mb-3">
        <SegmentedTabs
          values={HAZARD_KINDS}
          value={kind}
          onChange={setKind}
          label={k => t(`roadSafety.hazards.kind.${k}`)}
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

      {region ? (
        <Card className="mb-6">
          <h2 className="mb-1 text-lg font-semibold">{localizeRegion(region, i18n.language) ?? region}</h2>
          {roads ? (
            <dl className="text-sm">
              <div className="flex justify-between gap-3 border-b border-[var(--color-border)]/50 py-1">
                <dt className="text-[var(--color-muted)]">{t('alarms.roads.deaths', { year: regions.data?.year })}</dt>
                <dd className="font-medium">{numberFormat.format(roads.deaths)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-[var(--color-border)]/50 py-1">
                <dt className="text-[var(--color-muted)]">{t('alarms.cars.crashes')}</dt>
                <dd className="font-medium">{numberFormat.format(roads.crashes)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-[var(--color-muted)]">{t(`roadSafety.hazards.kind.${kind}`)}</dt>
                <dd className="font-medium">{numberFormat.format(roads.hazards)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{t('alarms.cars.noYear')}</p>
          )}
        </Card>
      ) : (
        <p className="mb-6 text-sm text-[var(--color-muted)]">{t('alarms.roads.pick')}</p>
      )}

      <p className="mb-6 text-xs text-[var(--color-muted)]">
        {t('alarms.roads.note', { year: hazards.data?.year ?? '' })}
      </p>
    </>
  )
}
