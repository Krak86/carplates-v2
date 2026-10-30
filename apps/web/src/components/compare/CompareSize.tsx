import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SideSilhouette from '@/components/size/SideSilhouette'
import SizeCarFront, { FRONT_PROFILES } from '@/components/size/SizeCarFront'
import SizeCarTop from '@/components/size/SizeCarTop'
import { axlePositions } from '@/components/size/silhouettes'
import type { VehicleSize } from '@/components/size/use-vehicle-size'
import { mmToMetres } from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

import CompareSectionHeading from './CompareSectionHeading'
import CompareSizeDim from './CompareSizeDim'
import { parseSizeParams } from './compare-share'
import type { ShareState } from './compare-share'
import { OVERLAY_MODES, VIEW_CHOICES, buildScene, drawnCar, viewsFor } from './size-overlay'
import type { DrawnCar, OverlayMode, Panel, ViewChoice } from './size-overlay'
import { SIDE_COLOR } from './visuals'

type Props = {
  sizes: readonly [VehicleSize | null, VehicleSize | null]
  names: readonly [string, string]
}

const MAJOR_MM = 1000
const MINOR_MM = 250

function Toggle<T extends string>({
  value,
  options,
  label,
  onChange,
  name
}: {
  value: T
  options: readonly T[]
  label: (option: T) => string
  onChange: (option: T) => void
  name: string
}): ReactNode {
  return (
    <div
      role="group"
      aria-label={name}
      className="inline-flex overflow-hidden rounded-full border border-[var(--color-border)] text-sm"
    >
      {options.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'px-3 py-1',
            value === option ? 'bg-[var(--color-primary)] text-[var(--color-bg)]' : 'hover:text-[var(--color-primary)]'
          )}
        >
          {label(option)}
        </button>
      ))}
    </div>
  )
}

type CarDrawingProps = {
  car: DrawnCar
  panel: Panel
  side: 0 | 1
  fontSize: number
  lvl: number
  unit: string
  /** Right edge of this car in the drawing (the top view hangs its width arrow there). */
  right: number
  /** Clips the car's drawing (not its arrows) for the in-place divider. */
  clip?: string
}

/** One car in one panel: its drawing, the ground line and the dimension arrows the other size sections show. */
function CarInPanel({ car, panel, side, fontSize, lvl, unit, right, clip }: CarDrawingProps): ReactNode {
  const color = SIDE_COLOR[side]
  const { x, y } = panel.at[side]
  const row = panel.dimRow[side]
  const m = (mm: number): string => `${mmToMetres(mm)} ${unit}`
  const tint = { '--color-primary': color } as CSSProperties
  const dim = { fontSize, color } as const
  const clipped = clip ? `url(#${clip})` : undefined

  if (panel.view === 'top') {
    return (
      <g>
        <g style={tint} clipPath={clipped}>
          <SizeCarTop x={x} y={y} dims={car} shape={car.shape} orientation="right" wheelbaseMm={car.wheelbaseMm} />
        </g>
        <CompareSizeDim
          {...dim}
          vertical
          x1={right + lvl * (1 + row)}
          y1={y}
          x2={right + lvl * (1 + row)}
          y2={y + car.widthMm}
          label={m(car.widthMm)}
        />
      </g>
    )
  }

  const ground = y + car.heightMm
  const groundLine = (
    <line
      clipPath={clipped}
      x1={x - lvl * 0.3}
      y1={ground}
      x2={x + (panel.view === 'side' ? car.lengthMm : car.widthMm) + lvl * 0.3}
      y2={ground}
      stroke="var(--color-muted)"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
    />
  )
  const height = (
    <CompareSizeDim
      {...dim}
      vertical
      x1={x - lvl * (1 + row)}
      y1={y}
      x2={x - lvl * (1 + row)}
      y2={ground}
      label={m(car.heightMm)}
    />
  )

  if (panel.view === 'front') {
    return (
      <g>
        {groundLine}
        <g style={tint} clipPath={clipped}>
          <SizeCarFront x={x} y={y} widthMm={car.widthMm} heightMm={car.heightMm} shape={car.shape} />
        </g>
        {height}
        <CompareSizeDim
          {...dim}
          x1={x}
          y1={ground + lvl * (0.9 + row)}
          x2={x + car.widthMm}
          y2={ground + lvl * (0.9 + row)}
          label={m(car.widthMm)}
        />
      </g>
    )
  }

  const { rear, front } = axlePositions(car.shape, car.lengthMm, car.wheelbaseMm)
  return (
    <g>
      {groundLine}
      <g clipPath={clipped}>
        <g transform={`translate(${x} ${y})`}>
          <SideSilhouette
            shape={car.shape}
            length={car.lengthMm}
            height={car.heightMm}
            rearAxle={rear}
            frontAxle={front}
            color={color}
            bodyOpacity={0.18}
          />
        </g>
      </g>
      {height}
      <CompareSizeDim
        {...dim}
        x1={x}
        y1={ground + lvl * (0.9 + row)}
        x2={x + car.lengthMm}
        y2={ground + lvl * (0.9 + row)}
        label={m(car.lengthMm)}
      />
    </g>
  )
}

/**
 * Both cars at true scale on a metre grid, rear bumpers aligned: side, top, front or all three; overlaid, stacked or
 * in place (a divider with A on one side and B on the other); regular or blueprint drawing.
 */
export default function CompareSize({ sizes, names }: Props): ReactNode {
  const { t } = useTranslation()
  const id = useId().replace(/:/g, '')
  const blueprint = useUiStore(s => s.blueprintEnabled)
  const setBlueprint = useUiStore(s => s.setBlueprintEnabled)
  const [params] = useSearchParams()
  const initial = parseSizeParams(params)
  const [choice, setChoice] = useState<ViewChoice>(initial.view ?? 'all')
  const [mode, setMode] = useState<OverlayMode>(initial.layout ?? 'beside')
  const [split, setSplit] = useState(initial.split ?? 50)
  const initialStyle = initial.style
  useEffect(() => {
    // A shared link opens on the sender's drawing style (the shared setting of the size sections).
    if (initialStyle) setBlueprint(initialStyle === 'blueprint')
  }, [initialStyle, setBlueprint])
  const svgRef = useRef<SVGSVGElement>(null)

  const [a, b] = [drawnCar(sizes[0]), drawnCar(sizes[1])] as const
  if (!a && !b) return null

  if (!a || !b) {
    return (
      <section aria-labelledby="compare-size">
        <CompareSectionHeading section="size" title={t('compare.size.title')} />
        <p className="text-sm text-[var(--color-muted)]">{t('compare.size.missing')}</p>
      </section>
    )
  }

  const cars = [a, b] as const
  const hasFront = !!FRONT_PROFILES[a.shape] && !!FRONT_PROFILES[b.shape]
  const { viewBox, panels, lvl } = buildScene(cars, viewsFor(choice, hasFront), mode)
  const [vx, vy, vw, vh] = viewBox
  const longest = Math.max(a.lengthMm, b.lengthMm)
  const fontSize = lvl * 0.42
  const unit = t('rdw.unitM')
  const splitX = vx + (vw * split) / 100
  const inPlace = mode === 'inplace'
  const alt = t('compare.size.alt', {
    a: names[0],
    b: names[1],
    lengthA: mmToMetres(a.lengthMm),
    lengthB: mmToMetres(b.lengthMm)
  })
  /** Moves the divider to the pointer: the svg is as wide as its viewBox, so the fraction of the box is the fraction of the scene. */
  const moveDivider = (e: PointerEvent): void => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    setSplit(Math.min(100, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * 100))))
  }
  const handleDragStart = (e: PointerEvent<SVGGElement>): void => {
    moveDivider(e)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // No active pointer (a synthetic event): the divider still moved, it just does not follow a drag.
    }
  }
  const handleDrag = (e: PointerEvent<SVGGElement>): void => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) moveDivider(e)
  }
  const shareState: ShareState = {
    view: choice,
    layout: mode,
    style: blueprint ? 'blueprint' : 'classic',
    ...(inPlace ? { split: String(split) } : {})
  }
  const gridStroke = blueprint ? 'var(--bp-grid)' : 'var(--color-border)'

  return (
    <section aria-labelledby="compare-size">
      <CompareSectionHeading section="size" title={t('compare.size.title')} state={shareState} />
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('compare.size.note', { m: MAJOR_MM / 1000 })}</p>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Toggle
          name={t('compare.size.style')}
          value={blueprint ? 'blueprint' : 'classic'}
          options={['classic', 'blueprint'] as const}
          label={v => t(`size.schema.${v}`)}
          onChange={v => setBlueprint(v === 'blueprint')}
        />
        <Toggle
          name={t('compare.size.views')}
          value={choice}
          options={VIEW_CHOICES}
          label={v => t(`compare.size.view.${v}`)}
          onChange={setChoice}
        />
        <Toggle
          name={t('compare.size.modes')}
          value={mode}
          options={OVERLAY_MODES}
          label={m => t(`compare.size.mode.${m}`)}
          onChange={setMode}
        />
      </div>

      <figure className={cn('m-0', blueprint && 'blueprint rounded-lg p-2')}>
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          role="img"
          aria-label={alt}
          className="h-auto w-full text-[var(--color-fg)]"
        >
          <title>{alt}</title>
          <defs>
            <pattern id={`${id}n`} width={MINOR_MM} height={MINOR_MM} patternUnits="userSpaceOnUse">
              <path
                d={`M${MINOR_MM} 0 V${MINOR_MM} M0 ${MINOR_MM} H${MINOR_MM}`}
                fill="none"
                stroke={gridStroke}
                strokeOpacity={blueprint ? 0.22 : 0.35}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            </pattern>
            <pattern id={`${id}j`} width={MAJOR_MM} height={MAJOR_MM} patternUnits="userSpaceOnUse">
              <path
                d={`M${MAJOR_MM} 0 V${MAJOR_MM} M0 ${MAJOR_MM} H${MAJOR_MM}`}
                fill="none"
                stroke={gridStroke}
                strokeOpacity={blueprint ? 0.45 : 0.8}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </pattern>
            <clipPath id={`${id}a`}>
              <rect x={vx} y={vy} width={splitX - vx} height={vh} />
            </clipPath>
            <clipPath id={`${id}b`}>
              <rect x={splitX} y={vy} width={vx + vw - splitX} height={vh} />
            </clipPath>
          </defs>
          <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}n)`} />
          <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}j)`} />

          {cars.map((car, i) => (
            <g key={i}>
              {panels.map(panel => (
                <CarInPanel
                  key={panel.view}
                  car={car}
                  panel={panel}
                  side={i as 0 | 1}
                  fontSize={fontSize}
                  lvl={lvl}
                  unit={unit}
                  right={mode === 'beside' ? panel.at[i as 0 | 1].x + car.lengthMm : longest}
                  clip={inPlace ? `${id}${i === 0 ? 'a' : 'b'}` : undefined}
                />
              ))}
            </g>
          ))}

          {inPlace && (
            <g
              stroke="var(--dim-active, var(--color-fg))"
              fill="var(--dim-active, var(--color-fg))"
              className="cursor-ew-resize"
              style={{ touchAction: 'none' }}
              onPointerDown={handleDragStart}
              onPointerMove={handleDrag}
            >
              <rect x={splitX - lvl * 0.6} y={vy} width={lvl * 1.2} height={vh} fill="transparent" stroke="none" />
              <line x1={splitX} y1={vy} x2={splitX} y2={vy + vh} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <circle cx={splitX} cy={vy + vh / 2} r={lvl * 0.35} stroke="var(--color-surface)" strokeWidth={2} />
            </g>
          )}
        </svg>

        {inPlace && (
          <label className="mt-1 flex items-center gap-2 text-sm">
            <span className="shrink-0 font-semibold" style={{ borderBottom: `3px solid ${SIDE_COLOR[0]}` }}>
              {names[0]}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={split}
              onChange={e => setSplit(Number(e.target.value))}
              aria-label={t('compare.size.slider', { a: names[0], b: names[1] })}
              className="min-w-0 flex-1"
            />
            <span className="shrink-0 font-semibold" style={{ borderBottom: `3px solid ${SIDE_COLOR[1]}` }}>
              {names[1]}
            </span>
          </label>
        )}
        <ul className="mt-2 space-y-1 text-sm">
          {cars.map((car, i) => (
            <li key={i} style={{ borderLeft: `3px solid ${SIDE_COLOR[i as 0 | 1]}`, paddingLeft: 8 }}>
              <span className="font-semibold">{names[i as 0 | 1]}</span>
              <span className="text-[var(--color-muted)]">
                {' '}
                {t('compare.size.dims', {
                  length: mmToMetres(car.lengthMm),
                  width: mmToMetres(car.widthMm),
                  height: mmToMetres(car.heightMm)
                })}
              </span>
            </li>
          ))}
        </ul>
      </figure>
    </section>
  )
}
