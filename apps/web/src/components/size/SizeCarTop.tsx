import type { ReactNode } from 'react'

import type { Dims } from '@/components/size/fit'
import { MIRRORS_MM } from '@/components/size/fit'
import {
  axlePositions,
  LAMP_COLOR,
  TAIL_COLOR,
  TOP_LAYOUT,
  topPath,
  TYRE_COLOR,
  WHEEL_MM
} from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  /** Top-left corner of the car body in drawing millimetres (mirrors and tyres stick out beyond it). */
  x: number
  y: number
  dims: Pick<Dims, 'lengthMm' | 'widthMm'>
  shape: SizeShape
  /** Which way the nose points: up (garage, parking) or right (the size schema). */
  orientation?: 'up' | 'right'
  wheelbaseMm?: number | null
}

type BoxRect = { x: number; y: number; width: number; height: number }

const MIRROR_LENGTH_MM = 150
const TYRE_WIDTH_MM = 230
const TYRE_OUT_MM = 25
const NO_ROOF: readonly SizeShape[] = ['bus', 'moto']

/**
 * The vehicle seen from above: a tapered body, the glass-house with a roof panel, lamps, mirrors and the tyres at the
 * real axle positions. One unit-box outline is mapped onto the length x width, nose up or nose right.
 */
export default function SizeCarTop({ x, y, dims, shape, orientation = 'up', wheelbaseMm = null }: Props): ReactNode {
  const { widthMm: w, lengthMm: l } = dims
  const layout = TOP_LAYOUT[shape]
  const [c0, c1] = layout.cabin
  const up = orientation === 'up'
  const { rear, front } = axlePositions(shape, l, wheelbaseMm)
  const wheel = WHEEL_MM[shape]
  const mirrorW = MIRRORS_MM / 2

  // `along` runs rear -> front, `across` left -> right (with the nose up: left of the picture).
  const point = (along: number, across: number): readonly [number, number] =>
    up ? [x + across, y + l - along] : [x + along, y + across]
  const box = (along: number, across: number, dAlong: number, dAcross: number): BoxRect => {
    const [x1, y1] = point(along, across)
    const [x2, y2] = point(along + dAlong, across + dAcross)
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
  }
  const unit = up ? `matrix(0 ${-l} ${w} 0 ${x} ${y + l})` : `matrix(${l} 0 0 ${w} ${x} ${y})`
  const span = c1 - c0
  const glass = `M${c0} 0.17 L${c1} 0.12 Q${c1 + 0.015} 0.5 ${c1} 0.88 L${c0} 0.83 Q${c0 - 0.01} 0.5 ${c0} 0.17 Z`
  const drawGlass = !NO_ROOF.includes(shape)

  return (
    <g>
      {shape !== 'moto' && (
        <>
          <rect
            {...box(l * c1 - MIRROR_LENGTH_MM, -mirrorW, MIRROR_LENGTH_MM, mirrorW + w * 0.04)}
            rx={30}
            fill="var(--color-primary)"
            fillOpacity={0.5}
          />
          <rect
            {...box(l * c1 - MIRROR_LENGTH_MM, w - w * 0.04, MIRROR_LENGTH_MM, mirrorW + w * 0.04)}
            rx={30}
            fill="var(--color-primary)"
            fillOpacity={0.5}
          />
        </>
      )}

      {[rear, front].map(axle => (
        <g key={axle} fill={TYRE_COLOR} stroke="var(--color-fg)" strokeOpacity={0.5} strokeWidth={1}>
          <rect {...box(axle - wheel / 2, -TYRE_OUT_MM, wheel, TYRE_WIDTH_MM)} rx={40} />
          <rect {...box(axle - wheel / 2, w - TYRE_WIDTH_MM + TYRE_OUT_MM, wheel, TYRE_WIDTH_MM)} rx={40} />
        </g>
      ))}

      <g transform={unit}>
        <path
          d={topPath(layout)}
          fill="var(--color-primary)"
          fillOpacity={0.25}
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {drawGlass && (
          <>
            <path d={glass} fill="var(--color-surface)" fillOpacity={0.8} />
            {shape !== 'truck' && (
              <rect
                x={c0 + span * 0.3}
                y={0.2}
                width={span * 0.42}
                height={0.6}
                rx={0.04}
                fill="var(--color-primary)"
                fillOpacity={0.3}
              />
            )}
          </>
        )}
        <path
          d={`M0.975 ${layout.nose} h0.02 v0.1 h-0.02 Z M0.975 ${1 - layout.nose - 0.1} h0.02 v0.1 h-0.02 Z`}
          fill={LAMP_COLOR}
        />
        <path
          d={`M0.005 ${layout.tail + 0.04} h0.02 v0.09 h-0.02 Z M0.005 ${1 - layout.tail - 0.13} h0.02 v0.09 h-0.02 Z`}
          fill={TAIL_COLOR}
        />
      </g>
    </g>
  )
}
