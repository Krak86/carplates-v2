import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { NO_SHARE_PATHS, usePageShareActions } from '@/components/use-page-share-actions'
import { ROUTE_TITLE_KEYS } from '@/hooks/useDocumentTitle'
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

// Beside the page's content (right of it), and never lower than the content's bottom edge. No room → the screen corner.
// The right edge comes from the result card, else the first home section (`main > *` is full-width there), else the page root.
function measure(): Position {
  const card = document.querySelector<HTMLElement>('main .card-vt')
  const page = document.querySelector<HTMLElement>('main > *')
  const edge = card ?? document.querySelector<HTMLElement>('main .section-vt') ?? page
  const fallback = { left: window.innerWidth - BUTTON_SIZE_PX - GAP_PX, bottom: GAP_PX }
  if (!edge || !page) return fallback
  const left = edge.getBoundingClientRect().right + GAP_PX
  if (left + BUTTON_SIZE_PX + GAP_PX > window.innerWidth) return fallback
  // The stack's bottom edge must stay above the content's bottom.
  const { bottom } = (card ?? page).getBoundingClientRect()
  return { left, bottom: Math.max(GAP_PX, window.innerHeight - bottom + GAP_PX) }
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
 * "collapse all open sections" button and a "feedback" (/discuss) button stacked above it. Lazy-loaded by `Layout` on the first scroll.
 */
export default function ScrollButtons(): ReactNode {
  const { t } = useTranslation()
  const isWide = useMediaQuery(WIDE_QUERY)
  const scrolled = useScrolledNow()
  // Only a plate / VIN result page (a single segment that is not a static route) has collapsible sections.
  const { pathname } = useLocation()
  const isResultRoute =
    pathname !== '/' && pathname.split('/').filter(Boolean).length === 1 && !(pathname in ROUTE_TITLE_KEYS)
  // On a result page the report carries the plate / VIN (see ReportIssueLink).
  const feedbackTo = isResultRoute ? `/discuss?about=${pathname.slice(1)}` : '/discuss'
  const isShareable =
    pathname !== '/' && !NO_SHARE_PATHS.has(pathname) && (isResultRoute || pathname in ROUTE_TITLE_KEYS)
  const { copied, share } = usePageShareActions()
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
      {isShareable && (
        <button
          type="button"
          aria-label={t('share.page')}
          title={t('share.page')}
          tabIndex={scrolled ? undefined : -1}
          onClick={() => void share()}
          className={BUTTON_CLASS}
        >
          {copied ? (
            <span aria-hidden className="text-xl leading-none">
              ✅
            </span>
          ) : (
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
              <path d="M12 3v12M8 7l4-4 4 4" />
              <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          )}
          <span className="sr-only" aria-live="polite">
            {copied ? t('share.copied') : ''}
          </span>
        </button>
      )}

      {pathname !== '/discuss' && (
        <Link
          viewTransition
          to={feedbackTo}
          aria-label={t('report.footer')}
          title={t('report.footer')}
          tabIndex={scrolled ? undefined : -1}
          className={BUTTON_CLASS}
        >
          <span aria-hidden className="text-xl leading-none">
            💬
          </span>
        </Link>
      )}

      {isResultRoute && (
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
      )}

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
