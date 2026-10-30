import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type VariantChip = {
  key: string
  label: string
  active: boolean
  onPick: () => void
}

type Props = {
  title: string
  chips: VariantChip[]
}

/** One labelled row of toggle chips. Local state only: picking one re-feeds the sections below, it never changes the URL. */
export default function VariantChipRow({ title, chips }: Props): ReactNode {
  if (chips.length < 2) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-[var(--color-muted)]">{title}</span>
      {chips.map(chip => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={chip.active}
          onClick={chip.onPick}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-sm transition-colors',
            chip.active
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
