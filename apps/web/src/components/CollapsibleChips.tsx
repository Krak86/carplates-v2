import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
}

/** ~3 chip rows (1.5rem chips, 0.375rem gaps) plus a faded sliver of the 4th. */
const COLLAPSED_PX = 104

/**
 * Phones only: clips a long chip list to three rows plus a faded fourth, with a "show more" toggle underneath.
 * From `md` up it renders the list untouched. The toggle appears only when the content really overflows.
 */
export default function CollapsibleChips({ children, className }: Props): ReactNode {
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

  const clipped = overflowing && !expanded

  return (
    <div className={className}>
      <div
        style={overflowing ? ({ '--chips-max': `${expanded ? height : COLLAPSED_PX}px` } as CSSProperties) : undefined}
        className={cn(
          'max-md:max-h-(--chips-max) max-md:overflow-hidden max-md:transition-[max-height] max-md:duration-300 max-md:ease-in-out',
          clipped && 'max-md:mask-[linear-gradient(to_bottom,black_65%,transparent)]'
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
          className="mt-1 flex w-full items-center justify-center gap-1 text-xs text-[var(--color-primary)] md:hidden"
        >
          {expanded ? t('result.chipsLess') : t('result.chipsMore')}
          <span aria-hidden className={cn('inline-block transition-transform duration-200', expanded && 'rotate-180')}>
            ▾
          </span>
        </button>
      )}
    </div>
  )
}
