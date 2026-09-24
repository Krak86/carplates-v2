import type { ReactNode, Ref } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

export default function Card({ children, className, ref }: Props): ReactNode {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
