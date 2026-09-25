import { useMemo, useState } from 'react'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoMercator } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

import Spinner from '@/components/ui/Spinner'
import { toIntlLocale } from '@/lib/intl'
import { ukraineGeographyQuery } from '@/lib/queries'
import type { UkraineRegionProperties } from '@/lib/api'
import { choroplethColor } from '@/routes/stats/helpers'
import { REGION_NAME_BY_SHAPE_ISO } from '@/routes/stats/region-geography'
import { useUiStore } from '@/store/ui-store'

import type { StatsMetric, StatsRow } from './types'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520
const LEGEND_STEPS = 8

type Props = {
  rows: StatsRow[]
  metric: StatsMetric
}

type Hover = { name: string; value: number | null; x: number; y: number }

export default function StatsMap({ rows, metric }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const theme = useUiStore(s => s.theme)
  const geography = useQuery(ukraineGeographyQuery())
  const [hover, setHover] = useState<Hover | null>(null)

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  const valueByRegion = new Map(rows.map(r => [r.label, r[metric]]))
  const values = rows.map(r => r[metric])
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0

  const projection = useMemo(() => {
    if (!geography.data) return undefined
    return geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geography.data)
  }, [geography.data])

  const legendStops = Array.from({ length: LEGEND_STEPS }, (_, i) => choroplethColor(i / (LEGEND_STEPS - 1), theme))

  if (geography.isPending) {
    return (
      <p className="flex items-center gap-2 text-[var(--color-muted)]">
        <Spinner /> {t('result.loading')}
      </p>
    )
  }

  if (geography.isError || !projection) {
    return <p className="text-[var(--color-muted)]">{t('result.error')}</p>
  }

  return (
    <div>
      <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <ComposableMap width={MAP_WIDTH} height={MAP_HEIGHT} projection={projection} className="h-auto w-full">
          <Geographies geography={geography.data}>
            {({ geographies }) =>
              geographies.map(geo => {
                const properties = geo.properties as UkraineRegionProperties
                const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
                const regionName = name ?? properties.shapeISO
                const value = name ? valueByRegion.get(name) : undefined
                const isHovered = hover?.name === regionName
                const fill =
                  value === undefined
                    ? 'var(--color-border)'
                    : choroplethColor(max > min ? (value - min) / (max - min) : 1, theme)
                const label = `${regionName}: ${value === undefined ? t('stats.map.noData') : numberFormat.format(value)}`

                const handleEnter = (e: MouseEvent): void => {
                  setHover({ name: regionName, value: value ?? null, x: e.clientX, y: e.clientY })
                }
                const handleMove = (e: MouseEvent): void => {
                  setHover(h => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                }
                const handleLeave = (): void => setHover(null)
                const handleFocus = (e: FocusEvent<SVGPathElement>): void => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHover({ name: regionName, value: value ?? null, x: rect.left + rect.width / 2, y: rect.top })
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={isHovered ? 'var(--color-primary)' : 'var(--color-bg)'}
                    strokeWidth={isHovered ? 1.5 : 0.5}
                    aria-label={label}
                    onMouseEnter={handleEnter}
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                    onFocus={handleFocus}
                    onBlur={handleLeave}
                    style={{ outline: 'none', cursor: 'pointer' }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>

        {hover && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs shadow-md"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            <div className="font-medium">{hover.name}</div>
            <div className="text-[var(--color-muted)]">
              {hover.value === null ? t('stats.map.noData') : numberFormat.format(hover.value)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span>{numberFormat.format(min)}</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{ background: `linear-gradient(to right, ${legendStops.join(', ')})` }}
          />
          <span>{numberFormat.format(max)}</span>
        </div>

        <p className="mt-2 text-xs text-[var(--color-muted)]">{t('stats.map.attribution')}</p>
      </div>
    </div>
  )
}
