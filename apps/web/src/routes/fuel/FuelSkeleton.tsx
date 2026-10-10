import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import PowertrainSkeleton from '@/routes/fuel/PowertrainSkeleton'

const SUMMARY_CARDS = 3
const BAR_ROWS = 10
const LEADERBOARD_ROWS = 5

/**
 * Whole-page placeholder for /fuel, in the loaded page's order (summary cards, powertrains, tabs + bars, model
 * leaderboards, distribution), so nothing shifts when the data arrives.
 */
export default function FuelSkeleton(): ReactNode {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true" aria-label={t('result.loading')}>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: SUMMARY_CARDS }, (_, i) => (
          <Card key={i} className={i === SUMMARY_CARDS - 1 ? 'col-span-2 sm:col-span-1' : undefined}>
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>

      <PowertrainSkeleton />

      <Skeleton className="mb-3 h-10 w-56 rounded-lg" />
      <Card className="mb-6 space-y-3">
        <Skeleton className="h-3 w-2/3" />
        {Array.from({ length: BAR_ROWS }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </Card>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="space-y-2">
              {Array.from({ length: LEADERBOARD_ROWS }, (_, row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <Skeleton className="mb-3 h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  )
}
