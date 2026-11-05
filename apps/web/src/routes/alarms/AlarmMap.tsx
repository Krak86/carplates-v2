import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
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

type Props = {
  regions: readonly AlarmRegion[]
  showLabels?: boolean
}

/** Distance between the first two active touch points (0 if fewer than two). */
function pinchDistance(pointers: ReadonlyMap<number, { x: number; y: number }>): number {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

type GeoFeature = { properties: AlarmGeoProperties }

/** Oblasts, raions and communities (UN OCHA COD shapes): each alerted area is painted with its own level. */
export default function AlarmMap({ regions, showLabels = false }: Props): ReactNode {
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
    <div
      ref={frameRef}
      className={isFullscreen ? 'relative flex h-full w-full items-center bg-[var(--color-bg)]' : 'relative'}
    >
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
        className="h-auto"
        style={{
          width: '100%',
          maxHeight: isFullscreen ? '100vh' : undefined,
          touchAction: zoom > 1 ? 'none' : 'pan-y',
          cursor: 'grab',
          userSelect: 'none'
        }}
        onPointerDown={e => {
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointersRef.current.size === 2) {
            // Second finger: pinch-zoom from the current scale.
            pinchRef.current = { dist: pinchDistance(pointersRef.current) || 1, zoom }
            dragRef.current = null
            for (const id of pointersRef.current.keys()) e.currentTarget.setPointerCapture(id)
            return
          }
          // Touch keeps scrolling the page at 1x; a mouse can always drag.
          if (zoom <= 1 && e.pointerType !== 'mouse') return
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
          const scale = MAP_WIDTH / e.currentTarget.getBoundingClientRect().width
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
                stroke="var(--color-bg)"
                strokeWidth={0.5 / zoom}
                aria-label={`${localizeRegion(region, i18n.language) ?? o}: ${t(`alarms.status.${status}`)}`}
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
        </g>
      </svg>
    </div>
  )
}
