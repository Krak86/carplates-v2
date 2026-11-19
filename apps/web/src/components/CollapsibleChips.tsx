import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
  /** Async chips are still arriving: reserve ~3 rows so they land without pushing the card down. */
  pending?: boolean
}

/** ~3 chip rows (1.5rem chips, 0.375rem gaps) plus a faded sliver of the 4th. */
const COLLAPSED_PX = 104

/**
 * Clips a long chip list to three rows plus a faded fourth, with a "show more" toggle underneath (all viewport sizes, so
 * the card height is the same everywhere and late chips never push the page down). The toggle appears only when the content really overflows.
 */
export default function CollapsibleChips({ children, className, pending = false }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)
  const overflowing = height > COLLAPSED_PX + 4

  useEffect(() => {
    if (!content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(content.offsetHeight))
    observer.observe(content)
    return (): void => observer.disconnect()
  }, [content])

  // Before the first measurement (height 0) the list already starts collapsed, so a long list never renders full and then snaps shut.
  const collapsedMax = !expanded && (overflowing || height === 0)
  const clipped = overflowing && !expanded

  return (
    <div className={className}>
      <div
        style={
          overflowing || collapsedMax
            ? ({ '--chips-max': `${expanded ? height : COLLAPSED_PX}px` } as CSSProperties)
            : undefined
        }
        className={cn(
          'max-h-(--chips-max) overflow-hidden transition-[max-height] duration-300 ease-in-out',
          pending && 'min-h-[84px]',
          clipped && 'mask-[linear-gradient(to_bottom,black_65%,transparent)]'
        )}
      >
        <div ref={setContent} className="flex min-h-6 flex-wrap items-center gap-1.5">
          {children}
        </div>
      </div>

      {overflowing && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
          className="mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-[var(--color-primary)] transition-colors active:bg-[var(--color-border)]/40"
        >
          {expanded ? t('result.chipsLess') : t('result.chipsMore')}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-5"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 300ms ease-in-out'
            }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
