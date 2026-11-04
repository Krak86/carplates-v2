import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoMercator } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { AlarmRegion } from '@carplates/shared'

import { ukraineGeographyQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import type { UkraineRegionProperties } from '@/lib/api'
import { ALARM_FILL, statusOf } from '@/routes/alarms/helpers'
import { REGION_NAME_BY_SHAPE_ISO } from '@/routes/stats/region-geography'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520

type Props = {
  regions: readonly AlarmRegion[]
}

/** Oblast polygons (same geoBoundaries shapes as /stats) painted by alert scope. */
export default function AlarmMap({ regions }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const geography = useQuery(ukraineGeographyQuery())
  const projection = useMemo(
    () => (geography.data ? geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geography.data) : undefined),
    [geography.data]
  )

  if (geography.isPending) return <StatsMapSkeleton />
  if (geography.isError || !projection || !geography.data) {
    return <p className="text-[var(--color-muted)]">{t('result.error')}</p>
  }

  return (
    <ComposableMap
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      projection={projection}
      className="h-auto"
      style={{ width: '100%' }}
    >
      <Geographies geography={geography.data}>
        {({ geographies }) =>
          geographies.map(geo => {
            const properties = geo.properties as UkraineRegionProperties
            const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
            const status = statusOf(regions, name)
            const regionName = localizeRegion(name, i18n.language) ?? properties.shapeISO
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={ALARM_FILL[status]}
                stroke="var(--color-bg)"
                strokeWidth={0.5}
                aria-label={`${regionName}: ${t(`alarms.status.${status}`)}`}
                style={{ outline: 'none' }}
              />
            )
          })
        }
      </Geographies>
    </ComposableMap>
  )
}
