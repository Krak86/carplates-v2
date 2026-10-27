import type { ReactNode } from 'react'

import Skeleton from '@/components/ui/Skeleton'
import { BACKGROUND_MODES } from '@/lib/live-background'

/** Same footprint as LayersPanel, shown while its lazy chunk loads. */
export default function LayersPanelSkeleton(): ReactNode {
  return (
    <div aria-busy className="w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-lg">
      <div className="flex flex-col gap-1.5">
        {BACKGROUND_MODES.map(m => (
          <Skeleton key={m} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
