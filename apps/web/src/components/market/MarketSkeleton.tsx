import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Skeleton from '@/components/ui/Skeleton'
import { MARKET_VISIBLE } from './helpers'

/**
 * Placeholder of the "Cars for sale" block while the listings load. Same geometry as the real block (chip row, a strip of
 * `w-56` tiles with a `h-36` photo and four text lines, then the attribution line), so the section does not jump when the
 * cards arrive.
 */
export default function MarketSkeleton(): ReactNode {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true" aria-label={t('result.loading')} className="mb-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="ml-auto h-6 w-36 rounded-full" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: MARKET_VISIBLE }, (_, i) => (
          <div key={i} className="w-56 shrink-0 overflow-hidden rounded-lg border border-border bg-surface/60">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-1 p-2.5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-1 h-4 w-11/12" />
    </div>
  )
}
