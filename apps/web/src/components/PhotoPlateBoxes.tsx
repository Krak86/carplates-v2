import type { ReactNode } from 'react'
import type { PlateCandidate } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  candidates: PlateCandidate[]
  active: string | null
}

const toPercent = (fraction: number): string => `${(fraction * 100).toFixed(3)}%`

// Must sit inside a box that is exactly the photo's size (position: relative),
// since the boxes are placed by percentage of the photo's width/height.
export default function PhotoPlateBoxes({ candidates, active }: Props): ReactNode {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 block">
      {candidates.map(c =>
        c.box ? (
          <span
            key={c.plate}
            style={{
              left: toPercent(c.box.x),
              top: toPercent(c.box.y),
              width: toPercent(c.box.w),
              height: toPercent(c.box.h)
            }}
            className={cn('absolute rounded-sm border-2', c.plate === active ? 'border-green-400' : 'border-amber-400')}
          >
            <span
              className={cn(
                'absolute bottom-full left-0 mb-0.5 rounded px-1 text-[10px] leading-4 font-semibold whitespace-nowrap text-black sm:text-xs',
                c.plate === active ? 'bg-green-400' : 'bg-amber-400'
              )}
            >
              {c.plate}
            </span>
          </span>
        ) : null
      )}
    </span>
  )
}
