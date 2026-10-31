import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

const ROWS = 6

/** Placeholder card, also the `LazySection` fallback, so the page does not jump when a section mounts. */
export default function SectionSkeleton(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card className="mb-6">
      <div role="status" aria-busy="true" aria-label={t('result.loading')}>
        <Skeleton className="mb-3 h-5 w-48" />

        <div className="space-y-2">
          {Array.from({ length: ROWS }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </Card>
  )
}
