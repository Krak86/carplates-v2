import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

const bar = 'animate-pulse rounded-full bg-border'

/**
 * Placeholder in the result card's slot while the plate/VIN request or the card's lazy chunk is still loading: the same
 * outer box and a title, plate, chip rows and button row, so the page below (links, footer) stays where it will be.
 */
export default function ResultCardSkeleton(): ReactNode {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" className="relative w-full max-w-content">
      <span className="sr-only">{t('result.loading')}</span>
      <Card className="min-h-svh w-full overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="size-7 animate-pulse rounded-full bg-border" />
          <div className={`${bar} h-6 w-48`} />
        </div>
        <div className="mt-2 h-10 w-44 animate-pulse rounded-md bg-border" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[28, 36, 24, 32, 40, 28].map((w, i) => (
            <div key={i} className={`${bar} h-6`} style={{ width: `${w * 4}px`, maxWidth: '100%' }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="h-11 w-36 animate-pulse rounded-lg bg-border" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-border" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-border" />
        </div>
        <div className="mt-4 h-36 w-full animate-pulse rounded-lg bg-border/60" />
      </Card>
    </div>
  )
}
