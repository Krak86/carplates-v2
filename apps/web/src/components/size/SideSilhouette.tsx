import { useId } from 'react'
import type { ReactNode } from 'react'

import {
  ARCH_SHARE,
  DETAIL_PATHS,
  GLASS_PATHS,
  LIGHT_PATHS,
  LAMP_COLOR,
  MIRROR_PATHS,
  RIM_COLOR,
  SIDE_PATHS,
  SPOKE_COLOR,
  TAIL_COLOR,
  TYRE_COLOR,
  WHEEL_MM
} from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  shape: SizeShape
  /** Millimetres of the drawing: the body spans 0..length x 0..height, the ground is y = height. */
  length: number
  height: number
  rearAxle: number
  frontAxle: number
  /** Body colour (any CSS paint); the primary token by default. */
  color?: string
  /** Fill strength of the body: the guides use a pale tint, a mass drawing a solid one. */
  bodyOpacity?: number
}

const SPOKES = 5

type WheelProps = { cx: number; cy: number; r: number }

/** Tyre, rim, five spokes and a hub: enough to read as a wheel at 40 px and still hold up at full width. */
export function Wheel({ cx, cy, r }: WheelProps): ReactNode {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={TYRE_COLOR}
        stroke="var(--color-fg)"
        strokeOpacity={0.5}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cy} r={r * 0.64} fill={RIM_COLOR} />

      <g stroke={SPOKE_COLOR} strokeWidth={r * 0.09} strokeLinecap="round">
        {Array.from({ length: SPOKES }, (_, i) => {
          const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 0.56} y2={cy + Math.sin(a) * r * 0.56} />
        })}
      </g>

      <circle cx={cx} cy={cy} r={r * 0.15} fill={SPOKE_COLOR} />
    </g>
  )
}

/**
 * The side view of a vehicle at real scale: the shape's hand-drawn outline stretched to length x height, wheel arches
 * cut out at the real axle positions, glass panes with pillars, door seams, lamps and a mirror, then the wheels. Front to
 * the right. The caller sets the viewBox and, for a diagram, draws its dimension arrows around it.
 */
export default function SideSilhouette({
  shape,
  length,
  height,
  rearAxle,
  frontAxle,
  color = 'var(--color-primary)',
  bodyOpacity = 0.2
}: Props): ReactNode {
  const id = useId().replace(/:/g, '')
  const wheel = WHEEL_MM[shape]
  const r = wheel / 2
  const archR = r * ARCH_SHARE[shape]
  const cy = height - r
  const axles = [rearAxle, frontAxle]
  const glass = GLASS_PATHS[shape]
  const mirror = MIRROR_PATHS[shape]
  const lights = LIGHT_PATHS[shape]
  const unit = `scale(${length} ${height})`

  return (
    <g>
      <defs>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-length} y={-height} width={length * 3} height={height * 3}>
          <rect x={-length} y={-height} width={length * 3} height={height * 3} fill="white" />
          {archR > 0 && axles.map(x => <circle key={x} cx={x} cy={cy} r={archR} fill="black" />)}
        </mask>
        <clipPath id={`${id}c`}>
          <path d={SIDE_PATHS[shape]} transform={unit} />
        </clipPath>
      </defs>

      <g mask={`url(#${id}m)`}>
        <g transform={unit}>
          <path
            d={SIDE_PATHS[shape]}
            fill={color}
            fillOpacity={bodyOpacity}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {glass && <path d={glass} fill="var(--color-surface)" fillOpacity={0.8} />}
          <path
            d={DETAIL_PATHS[shape]}
            fill="none"
            stroke={color}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {mirror && <path d={mirror} fill={color} fillOpacity={0.7} />}
          <path d={lights.head} fill={LAMP_COLOR} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={lights.tail} fill={TAIL_COLOR} fillOpacity={0.85} />
        </g>
      </g>

      {archR > 0 && (
        <g clipPath={`url(#${id}c)`} fill="none" stroke={color} strokeWidth={2}>
          {axles.map(x => (
            <circle key={x} cx={x} cy={cy} r={archR} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}

      {axles.map(x => (
        <Wheel key={x} cx={x} cy={cy} r={r} />
      ))}
    </g>
  )
}
