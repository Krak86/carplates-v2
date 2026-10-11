import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
}

/**
 * Region next to the plate. On phones it stays on one line, cut with "…" when it doesn't fit; a tap
 * reveals the full name (wrapping onto more lines). From `md` up it is plain text.
 */
export default function RegionLabel({ children }: Props): ReactNode {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded(v => !v)}
      className={cn(
        'min-w-0 cursor-pointer rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-left md:cursor-text',
        expanded ? 'animate-fade-in' : 'max-md:truncate'
      )}
    >
      {children}
    </button>
  )
}
