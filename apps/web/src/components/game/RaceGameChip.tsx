import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export default function RaceGameChip({ active, onClick, children }: Props): ReactNode {
  const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    onClick()
    e.currentTarget.blur() // keep focus off the buttons so keys always drive the car
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={handleClick}
      className={cn(
        'cursor-pointer rounded-full border px-2.5 py-0.5 text-sm transition-colors',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
      )}
    >
      {children}
    </button>
  )
}
