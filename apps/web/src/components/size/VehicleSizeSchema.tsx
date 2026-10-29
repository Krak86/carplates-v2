import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import SideSilhouette from '@/components/size/SideSilhouette'
import SizeCarTop from '@/components/size/SizeCarTop'
import { axlePositions, WHEEL_MM } from '@/components/size/silhouettes'
import type { SizeField, SizeFigures, SizeShape } from '@/components/size/VehicleSize.helpers'
import { estimatePrefix, mmToMetres } from '@/components/size/VehicleSize.helpers'

type Props = {
  shape: SizeShape
  figures: SizeFigures
  name: string
  /** The dimension the reader points at: it is drawn bold, the others fade. */
  active?: SizeField | null
  /** Pointing at a dimension in the drawing itself (hover / tap); null when the pointer leaves. */
  onActiveChange?: (field: SizeField | null) => void
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
      stroke={isActive ? 'var(--color-primary)' : 'var(--color-muted)'}
      strokeWidth={isActive ? 2.4 : 1.2}
      fill={isActive ? 'var(--color-primary)' : 'var(--color-fg)'}
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

  const alt = t('size.schema.alt', {
    name,
    length: text('lengthMm', length),
    width: text('widthMm', width),
    height: text('heightMm', height)
  })

  return (
    <figure className="mt-2">
      <svg
        role="img"
        aria-label={alt}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-auto w-full max-w-2xl text-[var(--color-fg)]"
      >
        <title>{alt}</title>

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

      <figcaption className="mt-1 text-xs text-[var(--color-muted)]">{t('size.schema.caption')}</figcaption>
    </figure>
  )
}
