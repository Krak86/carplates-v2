import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode, TransitionEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  /** Visible height in px while collapsed on a phone. */
  collapsedPx?: number
  /** Skip the collapse (few rows, or a table that scrolls on its own). */
  disabled?: boolean
}

const DEFAULT_COLLAPSED_PX = 340

type Phase = 'closed' | 'opening' | 'open'

/**
 * Phone-only "show more" frame: clips tall content to `collapsedPx` with a fade, then opens to the
 * full height with a short height transition (own compositing layer, no scroll jank). From `md` up
 * it is inert and renders the children as-is.
 */
export default function MobileCollapse({ children, collapsedPx = DEFAULT_COLLAPSED_PX, disabled }: Props): ReactNode {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [fullPx, setFullPx] = useState(collapsedPx)

  if (disabled) return <>{children}</>

  const handleOpen = (): void => {
    setFullPx(contentRef.current?.scrollHeight ?? collapsedPx)
    setPhase('opening')
  }

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget && phase === 'opening') setPhase('open')
  }

  const style = {
    '--collapse-h': `${phase === 'opening' ? fullPx : collapsedPx}px`
  } as CSSProperties

  return (
    <div>
      <div className="relative">
        <div
          ref={contentRef}
          style={phase === 'open' ? undefined : style}
          onTransitionEnd={handleTransitionEnd}
          className={cn(
            'transform-gpu overflow-hidden will-change-[height] motion-reduce:transition-none md:h-auto md:overflow-visible',
            phase !== 'open' && 'h-[var(--collapse-h)] transition-[height] duration-300 ease-out'
          )}
        >
          {children}
        </div>

        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-xl bg-gradient-to-t from-[var(--color-bg)] to-transparent transition-opacity duration-300 md:hidden',
            phase === 'closed' ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      {phase !== 'open' && (
        <button
          type="button"
          aria-expanded={phase === 'opening'}
          onClick={handleOpen}
          className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-primary)] md:hidden"
        >
          {t('common.showMore')}
        </button>
      )}
    </div>
  )
}
