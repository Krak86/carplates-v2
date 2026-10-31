import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props<T extends string> = {
  values: readonly T[]
  value: T
  onChange: (value: T) => void
  label: (value: T) => string
}

/** Small pressed-button group (the style of the year picker and the map metric switch). */
export default function SegmentedTabs<T extends string>({ values, value, onChange, label }: Props<T>): ReactNode {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {values.map(v => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
            v === value
              ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
              : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
          )}
        >
          {label(v)}
        </button>
      ))}
    </div>
  )
}
