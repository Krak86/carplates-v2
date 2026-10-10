import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useScrolledNow } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'

/** Phones keep the native scroll; the buttons are for desktop / tablet. */
const WIDE_QUERY = '(min-width: 768px)'
const BUTTON_SIZE_PX = 44
const GAP_PX = 16

const BUTTON_CLASS =
  'pointer-events-auto flex size-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/70 shadow-md backdrop-blur-md transition-colors hover:bg-[var(--color-surface)]'

type Position = { left: number; bottom: number }

// Beside the page's card (right of it), and never lower than the card's bottom edge. No card / no room → the screen corner.
function measure(): Position {
  const card = document.querySelector<HTMLElement>('main .card-vt') ?? document.querySelector<HTMLElement>('main > *')
  const fallback = { left: window.innerWidth - BUTTON_SIZE_PX - GAP_PX, bottom: GAP_PX }
  if (!card) return fallback
  const rect = card.getBoundingClientRect()
  const left = rect.right + GAP_PX
  if (left + BUTTON_SIZE_PX + GAP_PX > window.innerWidth) return fallback
  // Two buttons + the gap between them must stay above the card's bottom.
  return { left, bottom: Math.max(GAP_PX, window.innerHeight - rect.bottom + GAP_PX) }
}

// Section headers are the shared `SectionHeader` rows; an open one carries `data-open`. Clicking the row toggles it.
// Outer sections go first, and a collapsed parent unmounts its nested ones, so skip any node that is gone by then.
function collapseAllSections(): void {
  document.querySelectorAll<HTMLElement>('[data-section-header][data-open]').forEach(header => {
    if (header.isConnected) header.click()
  })
}

/**
 * Floating round buttons (desktop / tablet) shown once the page is scrolled: "back to top" (smooth) with a
 * "collapse all open sections" button stacked above it. Lazy-loaded by `Layout` on the first scroll.
 */
export default function ScrollButtons(): ReactNode {
  const { t } = useTranslation()
  const isWide = useMediaQuery(WIDE_QUERY)
  const scrolled = useScrolledNow()
  const [pos, setPos] = useState<Position>(measure)

  useEffect(() => {
    let frame = 0
    const update = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setPos(measure()))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Sections expanding / collapsing move the card's bottom edge.
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    return (): void => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [])

  if (!isWide) return null

  const handleTop = (): void => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div
      style={{ left: pos.left, bottom: pos.bottom }}
      className={cn(
        'pointer-events-none fixed z-20 flex flex-col gap-2 transition-[opacity,translate] duration-300 motion-reduce:transition-none',
        'starting:translate-y-4 starting:opacity-0',
        scrolled ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <button
        type="button"
        aria-label={t('scroll.collapseAll')}
        title={t('scroll.collapseAll')}
        tabIndex={scrolled ? undefined : -1}
        onClick={collapseAllSections}
        className={BUTTON_CLASS}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 4l-6 6M14 4v6h6" />
          <path d="M4 20l6-6M10 20v-6H4" />
        </svg>
      </button>

      <button
        type="button"
        aria-label={t('scroll.top')}
        title={t('scroll.top')}
        tabIndex={scrolled ? undefined : -1}
        onClick={handleTop}
        className={BUTTON_CLASS}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}
