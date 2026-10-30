import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import SideSilhouette from '@/components/size/SideSilhouette'
import SizeCarTop from '@/components/size/SizeCarTop'
import { axlePositions, WHEEL_MM } from '@/components/size/silhouettes'
import type { SizeField, SizeFigures, SizeShape } from '@/components/size/VehicleSize.helpers'
import { estimatePrefix, mmToMetres } from '@/components/size/VehicleSize.helpers'
import { exportFilename, saveSchemaPng } from '@/components/size/export-schema'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

type Props = {
  shape: SizeShape
  figures: SizeFigures
  name: string
  /** The dimension the reader points at: it is drawn bold, the others fade. */
  active?: SizeField | null
  /** Pointing at a dimension in the drawing itself (hover / tap); null when the pointer leaves. */
  onActiveChange?: (field: SizeField | null) => void
}

/** The pointed dimension; the blueprint style swaps it for a yellow. */
const ACTIVE_COLOR = 'var(--dim-active, var(--color-primary))'

/** Blueprint grid in millimetres: a minor line every `major / 5`, a bold one every `major` (a bus needs a coarser grid). */
function gridMajorMm(lengthMm: number): number {
  return lengthMm > 8000 ? 2000 : 1000
}

type DimProps = {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  fontSize: number
  /** Label sits beside a vertical arrow (rotated) or above a horizontal one. */
  vertical?: boolean
  dashed?: boolean
  field: SizeField
  active: SizeField | null
  onActiveChange?: (field: SizeField | null) => void
}

/** A dimension arrow: a line with end ticks and a centred label. All coordinates are millimetres of the drawing. */
function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  fontSize,
  vertical = false,
  dashed = false,
  field,
  active,
  onActiveChange
}: DimProps): ReactNode {
  const isActive = active === field
  const isFaded = active != null && !isActive
  const tick = fontSize * 0.45
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const label_ = vertical ? (
    <text
      x={mx - fontSize * 0.8}
      y={my}
      fontSize={fontSize}
      textAnchor="middle"
      transform={`rotate(-90 ${mx - fontSize * 0.8} ${my})`}
    >
      {label}
    </text>
  ) : (
    <text x={mx} y={my - fontSize * 0.4} fontSize={fontSize} textAnchor="middle">
      {label}
    </text>
  )

  return (
    <g
      stroke={isActive ? ACTIVE_COLOR : 'var(--color-muted)'}
      strokeWidth={isActive ? 2.4 : 1.2}
      fill={isActive ? ACTIVE_COLOR : 'var(--color-fg)'}
      opacity={isFaded ? 0.2 : 1}
      fontWeight={isActive ? 700 : undefined}
      className="cursor-pointer transition-opacity"
      onPointerEnter={() => onActiveChange?.(field)}
      onPointerLeave={() => onActiveChange?.(null)}
      onPointerDown={() => onActiveChange?.(field)}
      vectorEffect="non-scaling-stroke"
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={fontSize * 2.4} />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeDasharray={dashed ? `${fontSize * 0.3} ${fontSize * 0.3}` : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} vectorEffect="non-scaling-stroke" />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} vectorEffect="non-scaling-stroke" />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} vectorEffect="non-scaling-stroke" />
        </>
      )}
      <g stroke="none">{label_}</g>
    </g>
  )
}

/**
 * Side and top view of the vehicle, drawn to scale from its real figures: one hand-made outline per body shape is
 * stretched to the length x height (side) and length x width (top), the wheels sit at the real wheelbase, and every
 * dimension carries an arrow. A figure that is our forecast is prefixed with "≈" and its arrow is dashed.
 */
export default function VehicleSizeSchema({ shape, figures, name, active = null, onActiveChange }: Props): ReactNode {
  const { t } = useTranslation()
  const gridId = useId().replace(/:/g, '')
  const blueprint = useUiStore(s => s.blueprintEnabled)
  const setBlueprint = useUiStore(s => s.setBlueprintEnabled)
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const length = figures.lengthMm?.value ?? null
  const width = figures.widthMm?.value ?? null
  const height = figures.heightMm?.value ?? null
  if (length == null || width == null || height == null) return null

  const { rear: rearAxle, front: frontAxle } = axlePositions(shape, length, figures.wheelbaseMm?.value ?? null)
  const wheelbase = frontAxle - rearAxle
  const r = WHEEL_MM[shape] / 2

  const fs = length * 0.04
  const sideY = 0
  const arrowWb = height + length * 0.09
  const arrowLen = height + length * 0.17
  const topY = height + length * 0.3
  const viewX = -length * 0.16
  const viewY = -length * 0.03
  const viewW = length * 1.36
  const viewH = topY + width + length * 0.1 - viewY

  const text = (field: keyof SizeFigures, value: number): string =>
    `${estimatePrefix(figures[field]?.source ?? 'rdw')}${mmToMetres(value)} ${t('rdw.unitM')}`
  const isDashed = (field: keyof SizeFigures): boolean => figures[field]?.source === 'estimate'

  const handleSave = (): void => {
    if (!svgRef.current || !figureRef.current) return
    void saveSchemaPng(svgRef.current, {
      source: figureRef.current,
      title: `${name} · ${t('size.schema.blueprintScale', { m: gridMajorMm(length) / 1000 })} · carsua.app`,
      filename: exportFilename(name, blueprint),
      blueprint
    }).catch(() => undefined)
  }

  const major = gridMajorMm(length)
  const minor = major / 5
  const alt = t('size.schema.alt', {
    name,
    length: text('lengthMm', length),
    width: text('widthMm', width),
    height: text('heightMm', height)
  })

  return (
    <figure ref={figureRef} className={cn('mt-2 max-w-2xl', blueprint && 'blueprint rounded-lg p-2')}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label={t('size.schema.view')} className="flex gap-1">
          {[true, false].map(isBlueprint => (
            <button
              key={String(isBlueprint)}
              type="button"
              role="tab"
              aria-selected={blueprint === isBlueprint}
              onClick={() => setBlueprint(isBlueprint)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs',
                blueprint === isBlueprint
                  ? 'border-current font-semibold'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {t(isBlueprint ? 'size.schema.blueprint' : 'size.schema.classic')}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-full border border-current px-2.5 py-0.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          {t('size.schema.save')}
        </button>
      </div>

      <svg
        ref={svgRef}
        role="img"
        aria-label={alt}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-auto w-full text-[var(--color-fg)]"
      >
        <title>{alt}</title>

        {blueprint && (
          <>
            <defs>
              <pattern id={`${gridId}n`} width={minor} height={minor} patternUnits="userSpaceOnUse">
                <path
                  d={`M${minor} 0 V${minor} M0 ${minor} H${minor}`}
                  fill="none"
                  stroke="var(--bp-grid)"
                  strokeOpacity={0.22}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              </pattern>
              <pattern id={`${gridId}j`} width={major} height={major} patternUnits="userSpaceOnUse">
                <path
                  d={`M${major} 0 V${major} M0 ${major} H${major}`}
                  fill="none"
                  stroke="var(--bp-grid)"
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </pattern>
            </defs>
            <rect x={viewX} y={viewY} width={viewW} height={viewH} fill={`url(#${gridId}n)`} />
            <rect x={viewX} y={viewY} width={viewW} height={viewH} fill={`url(#${gridId}j)`} />
          </>
        )}

        {/* Side view: front to the right. */}
        <g transform={`translate(0 ${sideY})`}>
          <line
            x1={-length * 0.02}
            y1={height}
            x2={length * 1.02}
            y2={height}
            stroke="var(--color-muted)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <SideSilhouette shape={shape} length={length} height={height} rearAxle={rearAxle} frontAxle={frontAxle} />

          <Dim
            x1={-length * 0.07}
            y1={0}
            x2={-length * 0.07}
            y2={height}
            vertical
            label={text('heightMm', height)}
            fontSize={fs}
            dashed={isDashed('heightMm')}
            field="heightMm"
            active={active}
            onActiveChange={onActiveChange}
          />
          {figures.wheelbaseMm && (
            <Dim
              x1={rearAxle}
              y1={arrowWb}
              x2={frontAxle}
              y2={arrowWb}
              label={text('wheelbaseMm', wheelbase)}
              fontSize={fs}
              dashed={isDashed('wheelbaseMm')}
              field="wheelbaseMm"
              active={active}
              onActiveChange={onActiveChange}
            />
          )}
          <Dim
            x1={0}
            y1={arrowLen}
            x2={length}
            y2={arrowLen}
            label={text('lengthMm', length)}
            fontSize={fs}
            dashed={isDashed('lengthMm')}
            field="lengthMm"
            active={active}
            onActiveChange={onActiveChange}
          />
          {figures.wheelbaseMm && (
            <g stroke="var(--color-muted)" strokeWidth={1} strokeDasharray={`${fs * 0.2} ${fs * 0.25}`} fill="none">
              <line x1={rearAxle} y1={height - r} x2={rearAxle} y2={arrowWb} vectorEffect="non-scaling-stroke" />
              <line x1={frontAxle} y1={height - r} x2={frontAxle} y2={arrowWb} vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </g>

        {/* Top view: front to the right. */}
        <g transform={`translate(0 ${topY})`}>
          <SizeCarTop
            x={0}
            y={0}
            dims={{ lengthMm: length, widthMm: width }}
            shape={shape}
            orientation="right"
            wheelbaseMm={figures.wheelbaseMm?.value ?? null}
          />

          <Dim
            x1={length * 1.07}
            y1={0}
            x2={length * 1.07}
            y2={width}
            vertical
            label={text('widthMm', width)}
            fontSize={fs}
            dashed={isDashed('widthMm')}
            field="widthMm"
            active={active}
            onActiveChange={onActiveChange}
          />
        </g>
      </svg>

      <figcaption className="mt-1 text-xs text-[var(--color-muted)]">
        {blueprint ? t('size.schema.blueprintCaption', { m: major / 1000 }) : t('size.schema.caption')}
      </figcaption>

      {blueprint && (
        <div className="mt-1 ml-auto w-fit border border-current px-2 py-0.5 text-xs">
          {name} · {t('size.schema.blueprintScale', { m: major / 1000 })} · carsua.app
        </div>
      )}
    </figure>
  )
}
