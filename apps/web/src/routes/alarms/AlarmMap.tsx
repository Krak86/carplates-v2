import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoCentroid, geoMercator, geoPath } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import type { AlarmRegion } from '@carplates/shared'

import { alarmGeographyQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import { ALARM_FILL, levelFill, statusOf } from '@/routes/alarms/helpers'
import { areaTarget, indexLayer, planAlarmPaint, regionOfOblast } from '@/routes/alarms/geo-match'
import type { AlarmGeoProperties } from '@/routes/alarms/geo-match'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520

const MAX_ZOOM = 8
const ZOOM_STEP = 1.6

/** Trailing "область" / "Oblast" dropped so the labels fit inside the shapes. */
const OBLAST_SUFFIX = /\s+(область|oblast)$/i

/** What an `overlay` gets: projected region centres (plate-region name → x, y in map units) and the current zoom. */
export type AlarmMapOverlayContext = {
  centers: ReadonlyMap<string, readonly [number, number]>
  zoom: number
  /** Projects a point (lon, lat) to map units; null when the map is not ready. */
  project: (lon: number, lat: number) => readonly [number, number] | null
}

type Props = {
  regions: readonly AlarmRegion[]
  showLabels?: boolean
  /** Extra SVG drawn above the alarm fills (markers, badges). It must never recolour the alarm shapes. */
  overlay?: (ctx: AlarmMapOverlayContext) => ReactNode
  /** Makes oblasts selectable (click / Enter); the fill stays the alarm colour, selection only adds an outline. */
  onSelectRegion?: (region: string) => void
  selectedRegion?: string | null
}

/** Distance between the first two active touch points (0 if fewer than two). */
function pinchDistance(pointers: ReadonlyMap<number, { x: number; y: number }>): number {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

type GeoFeature = { properties: AlarmGeoProperties }

/** Oblasts, raions and communities (UN OCHA COD shapes): each alerted area is painted with its own level. */
export default function AlarmMap({
  regions,
  showLabels = false,
  overlay,
  onSelectRegion,
  selectedRegion
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const needs = (layer: 'raions' | 'hromadas'): boolean =>
    regions.some(r => r.scope === 'partial' && r.areas.some(a => areaTarget(r.region, a)?.layer === layer))
  const oblasts = useQuery(alarmGeographyQuery('oblasts'))
  const raions = useQuery(alarmGeographyQuery('raions', needs('raions')))
  const hromadas = useQuery(alarmGeographyQuery('hromadas', needs('hromadas')))
  const geography = oblasts
  const projection = useMemo(
    () => (oblasts.data ? geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], oblasts.data) : undefined),
    [oblasts.data]
  )
  const centers = useMemo(() => {
    const map = new Map<string, readonly [number, number]>()
    if (!oblasts.data || !projection) return map
    for (const feature of oblasts.data.features) {
      const point = projection(geoCentroid(feature))
      if (point) map.set(regionOfOblast((feature.properties as unknown as AlarmGeoProperties).o), point)
    }
    return map
  }, [oblasts.data, projection])
  const raionIndex = useMemo(
    () => (raions.data ? indexLayer(raions.data.features as unknown as GeoFeature[]) : undefined),
    [raions.data]
  )
  const hromadaIndex = useMemo(
    () => (hromadas.data ? indexLayer(hromadas.data.features as unknown as GeoFeature[]) : undefined),
    [hromadas.data]
  )
  const plan = planAlarmPaint(regions, { raions: raionIndex, hromadas: hromadaIndex })

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef(zoom)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  // Wheel zoom needs a non-passive native listener to stop the page from scrolling. At 1x, scrolling down
  // still scrolls the page, so the map never traps the wheel.
  const hasMap = !geography.isPending && !geography.isError
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      const current = zoomRef.current
      if (e.deltaY > 0 && current <= 1) return
      e.preventDefault()
      const k = Math.min(MAX_ZOOM, Math.max(1, current * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)))
      setZoom(k)
      if (k === 1) setOffset({ x: 0, y: 0 })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [hasMap])
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  // A drag that ends on a region must not select it.
  const movedRef = useRef(false)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const zoomTo = (next: number) => {
    const k = Math.min(MAX_ZOOM, Math.max(1, next))
    setZoom(k)
    if (k === 1) setOffset({ x: 0, y: 0 })
  }
  const endPointer = (e: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)
    pinchRef.current = null
    // One finger left after a pinch: carry on panning from where it is.
    const [rest] = [...pointersRef.current.values()]
    dragRef.current = rest && zoom > 1 ? { x: rest.x, y: rest.y, ox: offset.x, oy: offset.y } : null
  }
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frameRef.current?.requestFullscreen?.()
  }

  if (geography.isPending) return <StatsMapSkeleton />
  if (geography.isError || !projection || !oblasts.data) {
    return <p className="text-[var(--color-muted)]">{t('result.error')}</p>
  }
  const path = geoPath(projection)

  const buttonClass =
    'grid size-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-lg leading-none hover:bg-[var(--color-border)] disabled:opacity-40'

  return (
    <div ref={frameRef} className={isFullscreen ? 'relative h-full w-full bg-[var(--color-bg)]' : 'relative'}>
      <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
        <button
          type="button"
          className={buttonClass}
          aria-label={t('alarms.zoomIn')}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => zoomTo(zoom * ZOOM_STEP)}
        >
          +
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-label={t('alarms.zoomOut')}
          disabled={zoom <= 1}
          onClick={() => zoomTo(zoom / ZOOM_STEP)}
        >
          -
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-label={isFullscreen ? t('alarms.exitFullscreen') : t('alarms.fullscreen')}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        // Fullscreen: the svg fills the screen and the whole country stays in view (zoom in for detail).
        preserveAspectRatio="xMidYMid meet"
        className={isFullscreen ? undefined : 'h-auto'}
        style={{
          width: '100%',
          height: isFullscreen ? '100%' : undefined,
          touchAction: zoom > 1 || isFullscreen ? 'none' : 'pan-y',
          cursor: 'grab',
          userSelect: 'none'
        }}
        onPointerDown={e => {
          movedRef.current = false
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointersRef.current.size === 2) {
            // Second finger: pinch-zoom from the current scale.
            pinchRef.current = { dist: pinchDistance(pointersRef.current) || 1, zoom }
            dragRef.current = null
            for (const id of pointersRef.current.keys()) e.currentTarget.setPointerCapture(id)
            return
          }
          // Touch keeps scrolling the page at 1x; a mouse can always drag.
          if (zoom <= 1 && e.pointerType !== 'mouse' && !isFullscreen) return
          e.currentTarget.setPointerCapture(e.pointerId)
          dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
        }}
        onPointerMove={e => {
          if (pointersRef.current.has(e.pointerId)) {
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          }
          const pinch = pinchRef.current
          if (pinch && pointersRef.current.size >= 2) {
            zoomTo(pinch.zoom * (pinchDistance(pointersRef.current) / pinch.dist))
            return
          }
          const drag = dragRef.current
          if (!drag) return
          if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) movedRef.current = true
          const rect = e.currentTarget.getBoundingClientRect()
          const pxPerUnit = isFullscreen
            ? Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT)
            : rect.width / MAP_WIDTH
          const scale = 1 / pxPerUnit
          const limitX = (MAP_WIDTH * zoom) / 2
          const limitY = (MAP_HEIGHT * zoom) / 2
          setOffset({
            x: Math.min(limitX, Math.max(-limitX, drag.ox + (e.clientX - drag.x) * scale)),
            y: Math.min(limitY, Math.max(-limitY, drag.oy + (e.clientY - drag.y) * scale))
          })
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <g
          transform={`translate(${MAP_WIDTH / 2 + offset.x} ${MAP_HEIGHT / 2 + offset.y}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`}
        >
          {oblasts.data.features.map(feature => {
            const { o } = feature.properties as unknown as AlarmGeoProperties
            const region = regionOfOblast(o)
            const paint = plan.oblasts.get(o)
            const status = statusOf(regions, region)
            return (
              <path
                key={o}
                d={path(feature) ?? undefined}
                fill={paint ? levelFill(paint.level, paint.kind === 'fallback') : ALARM_FILL.none}
                stroke={selectedRegion === region ? 'var(--color-primary)' : 'var(--color-bg)'}
                strokeWidth={(selectedRegion === region ? 2 : 0.5) / zoom}
                aria-label={`${localizeRegion(region, i18n.language) ?? o}: ${t(`alarms.status.${status}`)}`}
                {...(onSelectRegion
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      style: { cursor: 'pointer', outline: 'none' },
                      onClick: () => {
                        if (!movedRef.current) onSelectRegion(region)
                      },
                      onKeyDown: (e: KeyboardEvent<SVGPathElement>) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        onSelectRegion(region)
                      }
                    }
                  : {})}
              />
            )
          })}
          {plan.shapes.map(shape => {
            const collection = shape.layer === 'raions' ? raions.data : hromadas.data
            const feature = collection?.features[shape.index]
            if (!feature) return null
            return (
              <path
                key={`${shape.layer}-${shape.index}`}
                d={path(feature) ?? undefined}
                fill={levelFill(shape.level, false)}
                stroke="var(--color-bg)"
                strokeWidth={0.4 / zoom}
                aria-label={`${(feature.properties as unknown as AlarmGeoProperties).n ?? ''}: ${t('alarms.status.partial')}`}
              />
            )
          })}
          {showLabels && (
            <g aria-hidden pointerEvents="none">
              {oblasts.data.features.map(feature => {
                const { o } = feature.properties as unknown as AlarmGeoProperties
                const name = regionOfOblast(o)
                const point = projection(geoCentroid(feature))
                if (!point) return null
                return (
                  <text
                    key={o}
                    x={point[0]}
                    y={point[1]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9 / zoom}
                    fontWeight={600}
                    fill="var(--color-fg)"
                    stroke="var(--color-bg)"
                    strokeWidth={2.5 / zoom}
                    paintOrder="stroke"
                  >
                    {(localizeRegion(name, i18n.language) ?? name).replace(OBLAST_SUFFIX, '')}
                  </text>
                )
              })}
            </g>
          )}
          {overlay?.({ centers, zoom, project: (lon, lat) => projection?.([lon, lat]) ?? null })}
        </g>
      </svg>
    </div>
  )
}
