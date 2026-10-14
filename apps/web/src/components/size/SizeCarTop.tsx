import type { ReactNode } from 'react'

import type { Dims } from '@/components/size/fit'
import { MIRRORS_MM } from '@/components/size/fit'
import { TOP_LAYOUT } from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  /** Top-left corner of the car body in drawing millimetres (mirrors stick out beyond it). */
  x: number
  y: number
  dims: Dims
  shape: SizeShape
}

const MIRROR_LENGTH_MM = 150

/** The car seen from above, front pointing UP, with its mirrors: the same outline the schema uses, turned 90°. */
export default function SizeCarTop({ x, y, dims, shape }: Props): ReactNode {
  const { widthMm: w, lengthMm: l } = dims
  const top = TOP_LAYOUT[shape]
  // The top-layout shares run rear -> front; with the front up, the front edge is y and the rear y + l.
  const cabinY = y + l * (1 - top.cabin[1])
  const cabinH = l * (top.cabin[1] - top.cabin[0])
  const mirrorW = MIRRORS_MM / 2

  return (
    <g>
      <rect
        x={x - mirrorW}
        y={cabinY}
        width={mirrorW}
        height={MIRROR_LENGTH_MM}
        rx={30}
        fill="var(--color-primary)"
        fillOpacity={0.5}
      />
      <rect
        x={x + w}
        y={cabinY}
        width={mirrorW}
        height={MIRROR_LENGTH_MM}
        rx={30}
        fill="var(--color-primary)"
        fillOpacity={0.5}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={l}
        rx={w * top.radius}
        fill="var(--color-primary)"
        fillOpacity={0.25}
        stroke="var(--color-primary)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x + w * 0.12}
        y={cabinY}
        width={w * 0.76}
        height={cabinH}
        rx={w * 0.18}
        fill="var(--color-surface)"
        fillOpacity={0.75}
      />
    </g>
  )
}
