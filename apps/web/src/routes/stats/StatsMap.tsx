import { useMemo, useState } from 'react'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoMercator, geoPath } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

import { brandLogoUrl } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'
import { regionBrandStatsQuery, ukraineGeographyQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import type { UkraineRegionProperties } from '@/lib/api'
import { choroplethColor } from '@/routes/stats/helpers'
import { REGION_NAME_BY_SHAPE_ISO } from '@/routes/stats/region-geography'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import { useUiStore } from '@/store/ui-store'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520
const LEGEND_STEPS = 8
/** Logo chip side in map units: the smallest region's, plus how much a region's fleet share (of the biggest region) adds. */
const LOGO_MIN = 18
const LOGO_GROW = 22
const TOOLTIP_BRANDS = 3

export type MapRow = { label: string; value: number }

type Props = {
  /** `label` = the Ukrainian `REGIONS` name. */
  rows: MapRow[]
  /** Draw the biggest brand's logo on every region (fetches the per-region brand rollup). */
  logos?: boolean
}

type Hover = { name: string; value: number | null; x: number; y: number; brands?: string }

export default function StatsMap({ rows, logos = false }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const theme = useUiStore(s => s.theme)
  const geography = useQuery(ukraineGeographyQuery())
  const regionBrands = useQuery({ ...regionBrandStatsQuery(), enabled: logos })
  const [hover, setHover] = useState<Hover | null>(null)

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  const valueByRegion = new Map(rows.map(r => [r.label, r.value]))
  const values = rows.map(r => r.value)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0

  const projection = useMemo(() => {
    if (!geography.data) return undefined
    return geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geography.data)
  }, [geography.data])

  const brandsByRegion = new Map((regionBrands.data?.regions ?? []).map(r => [r.region, r]))
  const maxFleet = Math.max(1, ...[...brandsByRegion.values()].map(r => r.fleet))
  const path = projection ? geoPath(projection) : undefined

  const legendStops = Array.from({ length: LEGEND_STEPS }, (_, i) => choroplethColor(i / (LEGEND_STEPS - 1), theme))

  if (geography.isPending) {
    return <StatsMapSkeleton />
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
                const regionName = localizeRegion(name, i18n.language) ?? properties.shapeISO
                const value = name ? valueByRegion.get(name) : undefined
                const isHovered = hover?.name === regionName
                const fill =
                  value === undefined
                    ? 'var(--color-border)'
                    : choroplethColor(max > min ? (value - min) / (max - min) : 1, theme)
                const label = `${regionName}: ${value === undefined ? t('stats.map.noData') : numberFormat.format(value)}`
                const brands = logos
                  ? brandsByRegion
                      .get(name ?? '')
                      ?.brands.slice(0, TOOLTIP_BRANDS)
                      .map(b => b.brand)
                      .join(', ')
                  : undefined

                const handleEnter = (e: MouseEvent): void => {
                  setHover({ name: regionName, value: value ?? null, x: e.clientX, y: e.clientY, brands })
                }
                const handleMove = (e: MouseEvent): void => {
                  setHover(h => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                }
                const handleLeave = (): void => setHover(null)
                const handleFocus = (e: FocusEvent<SVGPathElement>): void => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHover({
                    name: regionName,
                    value: value ?? null,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    brands
                  })
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

          {logos && path && geography.data && (
            <g pointerEvents="none" aria-hidden>
              {geography.data.features.map(feature => {
                const properties = feature.properties as UkraineRegionProperties
                const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
                const entry = name ? brandsByRegion.get(name) : undefined
                const brand = entry?.brands[0]?.brand
                const src = brandLogoUrl(brand)
                const [cx, cy] = path.centroid(feature)
                if (!entry || !src || !Number.isFinite(cx) || !Number.isFinite(cy)) return null
                const size = LOGO_MIN + LOGO_GROW * Math.sqrt(entry.fleet / maxFleet)
                return (
                  <g key={properties.shapeISO} transform={`translate(${cx - size / 2} ${cy - size / 2})`}>
                    <rect
                      width={size}
                      height={size}
                      rx={size / 5}
                      fill="white"
                      stroke="var(--color-border)"
                      strokeWidth={0.5}
                    />
                    <image
                      href={src}
                      x={size * 0.1}
                      y={size * 0.1}
                      width={size * 0.8}
                      height={size * 0.8}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                )
              })}
            </g>
          )}
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
            {hover.brands && (
              <div className="text-[var(--color-muted)]">
                {t('stats.map.topBrands')}: {hover.brands}
              </div>
            )}
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
