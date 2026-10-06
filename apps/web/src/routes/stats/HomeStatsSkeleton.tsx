import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

type Props = {
  /** `top`: four top-5 cards (TopStatsPanel); `models`: two model leaderboards (Fuel/SafetyModelsPanel). */
  variant: 'top' | 'models'
}

const ROWS = 5

/** Homepage placeholder with the loaded panels' grid and card heights, so the sections below don't jump. */
export default function HomeStatsSkeleton({ variant }: Props): ReactNode {
  const { t } = useTranslation()
  const isTop = variant === 'top'

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('result.loading')}
      className={
        isTop
          ? 'mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
          : 'mb-6 grid w-full gap-3 md:grid-cols-2'
      }
    >
      {Array.from({ length: isTop ? 4 : 2 }, (_, i) => (
        <Card key={i}>
          <Skeleton className={isTop ? 'mb-3 h-3 w-28' : 'mb-3 h-5 w-48'} />
          <div className="space-y-1">
            {Array.from({ length: ROWS }, (_, row) => (
              <Skeleton key={row} className="h-5 w-full" />
            ))}
          </div>
          <Skeleton className="mt-3 h-3 w-20" />
        </Card>
      ))}
    </div>
  )
}
