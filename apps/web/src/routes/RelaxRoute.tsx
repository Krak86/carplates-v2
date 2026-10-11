import type { ReactNode } from 'react'

import ShareLayoutButton from '@/components/ShareLayoutButton'

// Lazy-loaded (see App.tsx). The page is just the background layout behind it, plus a small share link.
export default function RelaxRoute(): ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-end">
      <ShareLayoutButton className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs shadow hover:bg-[var(--color-surface)]" />
    </div>
  )
}
