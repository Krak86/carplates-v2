import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

type Props = {
  /** `registry`: 4 summary cards + top-5 leaderboards + table; `rating` (fuel / safety): 3 cards + bar list + distribution. */
  variant: 'registry' | 'rating'
}

const LEADERBOARD_COUNT = 4
const LEADERBOARD_ROWS = 5
const TABLE_ROWS = 10
const BAR_ROWS = 8

function SummarySkeleton({ count }: { count: number }): ReactNode {
  return (
    <div
      className={
        count === 4 ? 'mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4' : 'mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3'
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className={count === 3 && i === 2 ? 'col-span-2 sm:col-span-1' : undefined}>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </Card>
      ))}
    </div>
  )
}

function TabsSkeleton(): ReactNode {
  return <Skeleton className="mb-4 h-10 w-56 rounded-lg" />
}

/**
 * Placeholder with the same block heights as the loaded stats pages, so content below them (news, footer) doesn't
 * jump down once the data arrives.
 */
export default function StatsSkeleton({ variant }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true" aria-label={t('result.loading')}>
      <SummarySkeleton count={variant === 'registry' ? 4 : 3} />

      {variant === 'registry' ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: LEADERBOARD_COUNT }, (_, i) => (
              <Card key={i}>
                <Skeleton className="mb-3 h-3 w-28" />
                <div className="space-y-2">
                  {Array.from({ length: LEADERBOARD_ROWS }, (_, row) => (
                    <Skeleton key={row} className="h-4 w-full" />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <TabsSkeleton />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-10 w-80 rounded-lg" />
            <Skeleton className="h-10 w-64 rounded-lg" />
          </div>

          <Card className="space-y-3">
            {Array.from({ length: TABLE_ROWS }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </Card>
        </>
      ) : (
        <>
          <TabsSkeleton />
          <Card className="mb-6 space-y-3">
            <Skeleton className="h-3 w-2/3" />
            {Array.from({ length: BAR_ROWS }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </Card>

          <Card>
            <Skeleton className="mb-3 h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </>
      )}
    </div>
  )
}
