import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoCentroid, geoMercator } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

import { alarmsQuery, ukraineGeographyQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import type { UkraineRegionProperties } from '@/lib/api'
import { ALARM_FILL, alarmTypeIcon, statusOf } from '@/routes/alarms/helpers'
import { REGION_NAME_BY_SHAPE_ISO } from '@/routes/stats/region-geography'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520

// Lazy-loaded (see LiveBackground.tsx). Fail closed: no data (503, stale, loading) draws no map and says so, never a calm map.
export default function AlarmBackground(): ReactNode {
  const { t, i18n } = useTranslation()
  const geography = useQuery(ukraineGeographyQuery())
  const alarms = useQuery(alarmsQuery())
  const projection = useMemo(
    () => (geography.data ? geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geography.data) : undefined),
    [geography.data]
  )

  const regions = alarms.data?.regions
  const noData = alarms.isError
  const updated = alarms.data ? new Date(alarms.data.fetchedAt).toLocaleTimeString(i18n.language) : undefined

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 flex flex-col items-center justify-center overflow-hidden bg-black">
      {regions && geography.data && projection && (
        <ComposableMap
          aria-hidden
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          projection={projection}
          className="h-auto max-h-full w-full max-w-5xl"
        >
          <Geographies geography={geography.data}>
            {({ geographies }) =>
              geographies.map(geo => {
                const properties = geo.properties as UkraineRegionProperties
                const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
                const status = statusOf(regions, name)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={ALARM_FILL[status]}
                    stroke="var(--color-bg)"
                    strokeWidth={0.5}
                    className={status === 'none' ? undefined : 'alarm-pulse'}
                    style={{ outline: 'none' }}
                  />
                )
              })
            }
          </Geographies>
          {geography.data.features.map(geo => {
            const name = REGION_NAME_BY_SHAPE_ISO[(geo.properties as UkraineRegionProperties).shapeISO]
            const region = regions.find(r => r.region === name)
            if (!region) return null
            return (
              <Marker key={geo.id ?? name} coordinates={geoCentroid(geo)}>
                <text textAnchor="middle" dominantBaseline="central" fontSize={16}>
                  {alarmTypeIcon(region.types)}
                </text>
              </Marker>
            )
          })}
        </ComposableMap>
      )}
      {/* Colour is never alone: the count, the time and the no-data state are text. */}
      <p role="status" className="mt-2 rounded-lg bg-[var(--color-bg)]/80 px-3 py-1 text-sm backdrop-blur-md">
        {noData
          ? t('alarms.noData')
          : regions
            ? `${t('alarms.count', { count: regions.length })} · ${t('alarms.updated', { time: updated })}`
            : ''}
      </p>
      {regions && regions[0] && (
        <span className="sr-only">
          {regions
            .map(r => `${localizeRegion(r.region, i18n.language) ?? r.region}: ${t(`alarms.status.${r.scope}`)}`)
            .join('; ')}
        </span>
      )}
    </div>
  )
}
