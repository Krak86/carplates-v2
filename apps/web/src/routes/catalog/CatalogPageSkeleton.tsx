import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

type Props = {
  /** `make`: a models table; `model`: stat bar blocks plus the variant chips. */
  variant: 'make' | 'model'
}

const MODEL_ROWS = 8
const STAT_BLOCKS = 5

/** The loading shape of `/cars/:make` and `/cars/:make/:model`: same cards, same order, so the real page replaces it without a jump. */
export default function CatalogPageSkeleton({ variant }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={t('result.loading')}
      className="mx-auto w-full max-w-6xl space-y-4"
    >
      <Skeleton className="h-5 w-1/2 max-w-sm" />

      <Card>
        <div className="mb-2 flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-2/3 max-w-xs" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </Card>

      {variant === 'make' ? (
        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-9 w-full rounded-lg sm:max-w-xs" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: MODEL_ROWS }, (_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <Skeleton className="mb-3 h-7 w-40" />
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {Array.from({ length: STAT_BLOCKS }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-6 w-3/5" />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
            </div>
          </Card>
        </>
      )}

      <Card>
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card>
    </main>
  )
}
