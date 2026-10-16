import type { ReactNode } from 'react'

import { GLASS_PATHS, SIDE_PATHS } from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'

type Props = {
  shape: SizeShape
  className?: string
}

/** Length : height of a typical car of the shape, so the unit-box outline is not stretched into a tall box. */
const ASPECT: Readonly<Partial<Record<SizeShape, number>>> = {
  hatch: 3,
  sedan: 3.5,
  wagon: 3.3,
  coupe: 3.4,
  suv: 2.7,
  mpv: 2.8,
  van: 2.7,
  pickup: 3.2
}
const DEFAULT_ASPECT = 3.2
const WHEEL_X = [0.2, 0.78] as const
const WHEEL_Y = 0.88
const WHEEL_R = 0.1

/** A decorative side view of a body shape from the Size section's outlines; the label next to it carries the meaning. */
export default function ShapeSilhouette({ shape, className }: Props): ReactNode {
  const aspect = ASPECT[shape] ?? DEFAULT_ASPECT
  const glass = GLASS_PATHS[shape]

  return (
    <svg aria-hidden viewBox={`0 0 ${aspect} 1`} className={cn('h-14 w-auto text-primary', className)} fill="none">
      <g transform={`scale(${aspect} 1)`}>
        <path
          d={SIDE_PATHS[shape]}
          fill="currentColor"
          fillOpacity={0.18}
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {glass && <path d={glass} fill="currentColor" fillOpacity={0.3} />}
      </g>

      {WHEEL_X.map(x => (
        <circle
          key={x}
          cx={x * aspect}
          cy={WHEEL_Y}
          r={WHEEL_R}
          fill="var(--color-surface)"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
