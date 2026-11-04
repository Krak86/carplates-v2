import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Skeleton from '@/components/ui/Skeleton'

/** Placeholder with the shape of a `ShowroomCard`, so the grid does not jump when the data arrives. */
function CardSkeleton(): ReactNode {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </li>
  )
}

type Props = {
  count?: number
}

export default function ShowroomCardSkeleton({ count = 8 }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label={t('result.loading')}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ul>
  )
}
