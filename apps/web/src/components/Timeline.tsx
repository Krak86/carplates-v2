import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type TimelineItem = {
  key: string
  content: ReactNode
  /** Fills this item's dot; defaults to the first item when `highlightFirst` is on. */
  highlight?: boolean
}

type Props = {
  items: TimelineItem[]
  /** Which way the connecting arrows point: `up` for newest-first lists, `down` for chronological ones. */
  arrows?: 'up' | 'down'
  /** Fills the first dot with the primary colour (the "current" step). */
  highlightFirst?: boolean
}

/** Vertical dot-and-line timeline: one point per item, a connecting arrow between neighbours. */
export default function Timeline({ items, arrows = 'up', highlightFirst = true }: Props): ReactNode {
  return (
    <ol className="m-0 list-none p-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <li
            key={item.key}
            className="-mx-4 flex gap-3 rounded-lg px-4 transition-colors hover:bg-[var(--color-border)]/40"
          >
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  'mt-1 h-3 w-3 shrink-0 rounded-full border-2',
                  (item.highlight ?? (highlightFirst && index === 0))
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                )}
              />
              {!isLast && (
                <span aria-hidden className="relative w-px flex-1 bg-[var(--color-border)]">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none text-[var(--color-muted)]">
                    {arrows === 'up' ? '▴' : '▾'}
                  </span>
                </span>
              )}
            </div>

            <div className={cn('min-w-0 flex-1 text-base', !isLast && 'pb-4')}>{item.content}</div>
          </li>
        )
      })}
    </ol>
  )
}
