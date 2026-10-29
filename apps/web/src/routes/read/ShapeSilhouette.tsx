import type { ReactNode } from 'react'

import SideSilhouette from '@/components/size/SideSilhouette'
import { axlePositions, DRAW_TYPICAL } from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'

type Props = {
  shape: SizeShape
  className?: string
}

/** Breathing room around the drawing, as a share of the length, so the tyre strokes are not cut off. */
const PAD = 0.02

/** A decorative side view of a body shape at a typical size; the label next to it carries the meaning. */
export default function ShapeSilhouette({ shape, className }: Props): ReactNode {
  const { lengthMm, heightMm, wheelbaseMm } = DRAW_TYPICAL[shape]
  const { rear, front } = axlePositions(shape, lengthMm, wheelbaseMm)
  const pad = lengthMm * PAD

  return (
    <svg
      aria-hidden
      viewBox={`${-pad} ${-pad} ${lengthMm + pad * 2} ${heightMm + pad * 2}`}
      className={cn('h-14 w-auto', className)}
    >
      <SideSilhouette shape={shape} length={lengthMm} height={heightMm} rearAxle={rear} frontAxle={front} />
    </svg>
  )
}
