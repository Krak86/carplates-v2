import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Skeleton from '@/components/ui/Skeleton'

/** Same 800×520 aspect box as the loaded map, plus the legend strip below it. */
export default function StatsMapSkeleton(): ReactNode {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true" aria-label={t('result.loading')}>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <Skeleton className="aspect-[800/520] w-full rounded-lg" />
      </div>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  )
}
