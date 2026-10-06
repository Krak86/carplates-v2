import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  className?: string
}

/** A pulsing placeholder block — size it with `className` (h-*, w-*), it never renders content. */
export default function Skeleton({ className }: Props): ReactNode {
  return <div aria-hidden className={cn('animate-pulse rounded bg-black/10 dark:bg-white/10', className)} />
}
