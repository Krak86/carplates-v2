import type { ReactNode } from 'react'
import type { PlateCandidate } from '@carplates/shared'

import { normalizePlate } from '@carplates/shared'

import { groupCandidates, needsGrouping } from '@/components/plate-groups'
import { cn } from '@/lib/cn'

type Props = {
  candidates: PlateCandidate[]
  active: string | null
}

const toPercent = (fraction: number): string => `${(fraction * 100).toFixed(3)}%`

// Must sit inside a box that is exactly the photo's size (position: relative),
// since the boxes are placed by percentage of the photo's width/height.
// One outline per plate in the photo: its alternative readings share it, and the number and color
// match the group in the "also found" chips.
export default function PhotoPlateBoxes({ candidates, active }: Props): ReactNode {
  const groups = groupCandidates(candidates)
  const grouped = needsGrouping(groups)
  // The route plate is Latin, the candidates may be Cyrillic: compare in canonical form.
  const activeKey = active ? normalizePlate(active) : null
  const hasActive = !!activeKey && groups.some(g => g.candidates.some(c => normalizePlate(c.plate) === activeKey))

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 block">
      {groups.map(group => {
        const box = group.candidates[0]?.box
        if (!box) return null
        const isActive = !!activeKey && group.candidates.some(c => normalizePlate(c.plate) === activeKey)
        const shown = group.candidates.find(c => normalizePlate(c.plate) === activeKey) ?? group.candidates[0]
        const others = group.candidates.length - 1
        return (
          <span
            key={group.index}
            style={{
              left: toPercent(box.x),
              top: toPercent(box.y),
              width: toPercent(box.w),
              height: toPercent(box.h),
              borderColor: grouped ? group.color : undefined,
              ...(isActive && grouped ? { boxShadow: `0 0 12px 2px ${group.color}` } : null)
            }}
            className={cn(
              'absolute rounded-sm',
              isActive ? 'z-10 border-[3px]' : 'border-2',
              hasActive && !isActive && 'opacity-50',
              !grouped && (isActive ? 'border-green-400' : 'border-amber-400')
            )}
          >
            <span
              style={{ backgroundColor: grouped ? group.color : undefined }}
              className={cn(
                'absolute bottom-full left-0 mb-0.5 rounded px-1 text-[10px] leading-4 font-semibold whitespace-nowrap text-black sm:text-xs',
                !grouped && (isActive ? 'bg-green-400' : 'bg-amber-400'),
                isActive && 'ring-2 ring-white/80'
              )}
            >
              {grouped && groups.length > 1 && `${group.index + 1} `}
              {shown?.plate}
              {others > 0 && ` +${others}`}
            </span>
          </span>
        )
      })}
    </span>
  )
}
