import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Skeleton from '@/components/ui/Skeleton'

type Props = {
  /** Number of text-line placeholders (default 3). */
  rows?: number
  className?: string
}

// Widths vary a little so the block reads as text, not as a bar chart.
const ROW_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-3/4'] as const

/** Placeholder for an expanded section whose data is still loading — replaces a bare "Loading…" line. */
export default function SectionSkeleton({ rows = 3, className }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true" aria-label={t('result.loading')} className={className ?? 'mt-2 space-y-2'}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-5 ${ROW_WIDTHS[i % ROW_WIDTHS.length]}`} />
      ))}
    </div>
  )
}
