import type { ReactNode } from 'react'

import Skeleton from '@/components/ui/Skeleton'

const ROWS = 5

/** Same footprint as NewsBellPanel, shown while its lazy chunk loads. */
export default function NewsBellSkeleton(): ReactNode {
  return (
    <div
      aria-busy
      className="w-80 max-w-[90vw] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg"
    >
      <Skeleton className="mb-3 h-4 w-24" />

      <div className="space-y-3">
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="size-5 shrink-0" />

            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="mx-auto mt-3 h-4 w-24" />
    </div>
  )
}
