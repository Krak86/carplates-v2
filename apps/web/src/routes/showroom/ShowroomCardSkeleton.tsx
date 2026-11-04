import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShowroomView } from '@carplates/shared'

import Skeleton from '@/components/ui/Skeleton'
import { showroomGridClass } from '@/routes/showroom/helpers'

const SHELL = 'overflow-hidden rounded-xl border border-border bg-surface shadow-sm'

/** Placeholder with the shape of a `ShowroomCard` in the chosen layout, so the grid does not jump when the data arrives. */
function CardSkeleton({ view }: { view: ShowroomView }): ReactNode {
  if (view === 'list')
    return (
      <li className={`${SHELL} flex items-center gap-3 p-2`}>
        <Skeleton className="aspect-video w-28 shrink-0 sm:w-36" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </li>
    )
  if (view === 'gallery')
    return (
      <li className={SHELL}>
        <Skeleton className="aspect-4/3 w-full rounded-none" />
      </li>
    )
  return (
    <li className={`${SHELL} flex flex-col`}>
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
  view?: ShowroomView
  count?: number
}

export default function ShowroomCardSkeleton({ view = 'grid', count = 8 }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <ul role="status" aria-busy="true" aria-label={t('result.loading')} className={showroomGridClass(view)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} view={view} />
      ))}
    </ul>
  )
}
