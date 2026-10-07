import type { ReactNode } from 'react'
import type { FavoriteLabel } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { labelColorVar } from '@/lib/favorite-labels'

type Props = {
  label: FavoriteLabel
  className?: string
}

/** A favorite label: its color dot + its name. */
export default function LabelChip({ label, className }: Props): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs',
        className
      )}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: labelColorVar(label.color) }}
      />
      <span className="truncate">{label.name}</span>
    </span>
  )
}
