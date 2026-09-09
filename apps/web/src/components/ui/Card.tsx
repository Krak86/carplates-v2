import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
}

export default function Card({ children, className }: Props): ReactNode {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
