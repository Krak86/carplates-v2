import { useMemo, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoMercator, geoPath } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

import { brandLogoUrl } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { regionBrandStatsQuery, regionFacetStatsQuery, ukraineGeographyQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import type { UkraineRegionProperties } from '@/lib/api'
import { choroplethColor } from '@/routes/stats/helpers'
import { REGION_NAME_BY_SHAPE_ISO } from '@/routes/stats/region-geography'
import { DEFAULT_MAP_MODE, regionMarker, spreadLogos } from '@/routes/stats/StatsMap.helpers'
import type { LogoChip, MapMode, RegionMarker } from '@/routes/stats/StatsMap.helpers'
import { countryLabel, flagSlug } from '@/components/vin/helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import { useUiStore } from '@/store/ui-store'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520
const LEGEND_STEPS = 8
/** Logo chip side in map units: the smallest region's, plus how much a region's fleet share (of the biggest region) adds. */
const LOGO_MIN = 18
const LOGO_GROW = 22
const MAX_ZOOM = 4
const ZOOM_STEP = 1

export type MapRow = { label: string; value: number }

/** Quiz mode: no tooltip or legend (they would give the answer away), polygons are clickable and painted by `marks`. */
export type MapQuiz = {
  /** `REGIONS` name → verdict colour. */
  marks: Readonly<Record<string, 'correct' | 'wrong'>>
  /** The region tapped but not yet answered (painted in the primary colour). */
  selected?: string | null
  onPick: (region: string) => void
  disabled?: boolean
}

type Props = {
  /** `label` = the Ukrainian `REGIONS` name. */
  rows: MapRow[]
  /** Draw a marker on every region (fetches the per-region rollup of the chosen `mode`). */
  logos?: boolean
  /** What the markers show; only read when `logos` is on. */
  mode?: MapMode
  quiz?: MapQuiz
}

type Hover = { name: string; value: number | null; x: number; y: number; brands?: string }

export default function StatsMap({ rows, logos = false, mode = DEFAULT_MAP_MODE, quiz }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const theme = useUiStore(s => s.theme)
  const geography = useQuery(ukraineGeographyQuery())
  const regionBrands = useQuery({ ...regionBrandStatsQuery(), enabled: logos && mode === 'brand' })
  const regionFacets = useQuery({ ...regionFacetStatsQuery(), enabled: logos && mode !== 'brand' })
  const [hover, setHover] = useState<Hover | null>(null)
  // Quiz only: the map grows inside a scrollable frame (native touch panning) so small regions are easy to hit.
  const [zoom, setZoom] = useState(1)
  const frameRef = useRef<HTMLDivElement>(null)

  const handleZoom = (next: number): void => {
    const frame = frameRef.current
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next))
    if (!frame || clamped === zoom) return
    // Keep the centre of the view fixed while the content grows or shrinks.
    const centreX = (frame.scrollLeft + frame.clientWidth / 2) / zoom
    const centreY = (frame.scrollTop + frame.clientHeight / 2) / zoom
    setZoom(clamped)
    requestAnimationFrame(() => {
      frame.scrollLeft = centreX * clamped - frame.clientWidth / 2
      frame.scrollTop = centreY * clamped - frame.clientHeight / 2
    })
  }

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
  const facetsByRegion = new Map((regionFacets.data?.regions ?? []).map(r => [r.region, r]))
  const markerData = (region: string | undefined) => {
    if (!region) return undefined
    if (mode === 'brand') {
      const entry = brandsByRegion.get(region)
      return entry && { fleet: entry.fleet, brands: entry.brands, models: [], fuels: [], origins: [] }
    }
    const entry = facetsByRegion.get(region)
    return entry && { fleet: entry.fleet, brands: [], models: entry.models, fuels: entry.fuels, origins: entry.origins }
  }
  const maxFleet = Math.max(1, ...[...brandsByRegion.values(), ...facetsByRegion.values()].map(r => r.fleet))
  const markerLabels = {
    fuel: (fuelClass: string): string => t(`stats.map.fuel.${fuelClass}`),
    country: (code: string): string => countryLabel(code, i18n.language, t)
  }
  const markerFor = (region: string | undefined): RegionMarker | null => {
    const data = markerData(region)
    if (!data) return null
    const flagOf = (code: string): string | null => {
      const slug = flagSlug(code)
      return slug ? `/country-flags/${slug}.svg` : null
    }
    return regionMarker(mode, data, markerLabels, brandLogoUrl, flagOf, toIntlLocale(i18n.language))
  }
  const path = projection ? geoPath(projection) : undefined

  const logoChips: (LogoChip & { marker: RegionMarker })[] = []
  if (logos && path && geography.data) {
    for (const feature of geography.data.features) {
      const properties = feature.properties as UkraineRegionProperties
      const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
      const data = markerData(name)
      const marker = markerFor(name)
      const [cx, cy] = path.centroid(feature)
      if (!data || !marker || (!marker.src && !marker.text) || !Number.isFinite(cx) || !Number.isFinite(cy)) continue
      const size = LOGO_MIN + LOGO_GROW * Math.sqrt(data.fleet / maxFleet)
      logoChips.push({ key: properties.shapeISO, cx, cy, size, marker })
    }
  }
  const markerByKey = new Map(logoChips.map(c => [c.key, c.marker]))
  const placedLogos = spreadLogos(logoChips, MAP_WIDTH, MAP_HEIGHT).flatMap(p => {
    const marker = markerByKey.get(p.key)
    return marker ? [{ ...p, marker }] : []
  })

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
        {quiz && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            <button
              type="button"
              aria-label={t('play.zoomIn')}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => handleZoom(zoom + ZOOM_STEP)}
              className="size-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-lg leading-none disabled:opacity-40"
            >
              +
            </button>
            <button
              type="button"
              aria-label={t('play.zoomOut')}
              disabled={zoom <= 1}
              onClick={() => handleZoom(zoom - ZOOM_STEP)}
              className="size-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-lg leading-none disabled:opacity-40"
            >
              -
            </button>
          </div>
        )}

        <div ref={frameRef} className={cn(quiz && 'max-h-[70vh] overflow-auto')}>
          <ComposableMap
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            projection={projection}
            className="h-auto"
            style={{ width: quiz ? `${zoom * 100}%` : '100%' }}
          >
            <Geographies geography={geography.data}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const properties = geo.properties as UkraineRegionProperties
                  const name = REGION_NAME_BY_SHAPE_ISO[properties.shapeISO]
                  const regionName = localizeRegion(name, i18n.language) ?? properties.shapeISO
                  const value = name ? valueByRegion.get(name) : undefined
                  const isHovered = hover?.name === regionName
                  const mark = quiz && name ? quiz.marks[name] : undefined
                  const fill = quiz
                    ? mark === 'correct'
                      ? 'var(--label-4)'
                      : mark === 'wrong'
                        ? 'var(--label-0)'
                        : name && name === quiz.selected
                          ? 'var(--color-primary)'
                          : 'var(--color-border)'
                    : value === undefined
                      ? 'var(--color-border)'
                      : choroplethColor(max > min ? (value - min) / (max - min) : 1, theme)
                  const label = quiz
                    ? regionName
                    : `${regionName}: ${value === undefined ? t('stats.map.noData') : numberFormat.format(value)}`
                  const brands = logos ? markerFor(name)?.summary : undefined

                  const handleEnter = (e: MouseEvent): void => {
                    setHover({ name: regionName, value: value ?? null, x: e.clientX, y: e.clientY, brands })
                  }
                  const handleMove = (e: MouseEvent): void => {
                    setHover(h => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                  }
                  const handleLeave = (): void => setHover(null)
                  const handlePick = (): void => {
                    if (quiz && name && !quiz.disabled) quiz.onPick(name)
                  }
                  const handleKeyDown = (e: KeyboardEvent<SVGPathElement>): void => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    handlePick()
                  }
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
                      onMouseEnter={quiz ? undefined : handleEnter}
                      onMouseMove={quiz ? undefined : handleMove}
                      onMouseLeave={handleLeave}
                      onFocus={quiz ? undefined : handleFocus}
                      onBlur={handleLeave}
                      onClick={quiz ? handlePick : undefined}
                      onKeyDown={quiz ? handleKeyDown : undefined}
                      tabIndex={quiz ? 0 : undefined}
                      role={quiz ? 'button' : undefined}
                      style={{ outline: 'none', cursor: 'pointer' }}
                    />
                  )
                })
              }
            </Geographies>

            {logos && (
              <g pointerEvents="none" aria-hidden>
                {placedLogos.map(chip => (
                  <g key={chip.key}>
                    {chip.displaced && (
                      <>
                        <line
                          x1={chip.cx}
                          y1={chip.cy}
                          x2={chip.x}
                          y2={chip.y}
                          stroke="var(--color-muted)"
                          strokeWidth={0.75}
                        />
                        <circle cx={chip.cx} cy={chip.cy} r={1.75} fill="var(--color-muted)" />
                      </>
                    )}
                    <g transform={`translate(${chip.x - chip.size / 2} ${chip.y - chip.size / 2})`}>
                      <rect
                        width={chip.size}
                        height={chip.size}
                        rx={chip.size / 5}
                        fill={chip.marker.color ?? 'white'}
                        stroke="var(--color-border)"
                        strokeWidth={0.5}
                      />
                      {chip.marker.src ? (
                        <image
                          href={chip.marker.src}
                          x={chip.size * 0.1}
                          y={chip.size * 0.1}
                          width={chip.size * 0.8}
                          height={chip.size * 0.8}
                          preserveAspectRatio="xMidYMid meet"
                        />
                      ) : (
                        <text
                          x={chip.size / 2}
                          y={chip.size / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={chip.size * 0.26}
                          fontWeight={600}
                          fill={chip.marker.color ? 'white' : 'var(--color-fg)'}
                        >
                          {chip.marker.text}
                        </text>
                      )}
                    </g>
                  </g>
                ))}
              </g>
            )}
          </ComposableMap>
        </div>

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
                {t(`stats.map.top.${mode}`)}: {hover.brands}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        {!quiz && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span>{numberFormat.format(min)}</span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{ background: `linear-gradient(to right, ${legendStops.join(', ')})` }}
            />
            <span>{numberFormat.format(max)}</span>
          </div>
        )}

        <p className={cn('text-xs text-[var(--color-muted)]', !quiz && 'mt-2')}>{t('stats.map.attribution')}</p>
      </div>
    </div>
  )
}
