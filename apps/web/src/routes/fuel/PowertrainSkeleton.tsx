import type { ReactNode } from 'react'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

const CLASS_ROWS = 7
const DETAIL_ROWS = 10

/** Placeholder with the loaded Powertrains panel's blocks (class table, drill-down tabs and top-10 list). */
export default function PowertrainSkeleton(): ReactNode {
  return (
    <Card className="mb-6">
      <Skeleton className="mb-2 h-5 w-64" />
      <Skeleton className="mb-4 h-3 w-3/4" />

      <div className="space-y-2.5">
        {Array.from({ length: CLASS_ROWS }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-wrap gap-1">
          <Skeleton className="mr-2 h-6 w-20" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-md" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: DETAIL_ROWS }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </Card>
  )
}
