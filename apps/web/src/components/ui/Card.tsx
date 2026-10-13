import type { ReactNode, Ref } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
  id?: string
  ref?: Ref<HTMLDivElement>
}

export default function Card({ children, className, id, ref }: Props): ReactNode {
  return (
    <div
      ref={ref}
      id={id}
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm md:p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
