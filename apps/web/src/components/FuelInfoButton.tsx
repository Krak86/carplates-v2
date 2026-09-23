import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { FUEL_ICON_FALLBACK, getFuelIcon, isKnownFuel } from '@/components/ResultCard.helpers'
import { cn } from '@/lib/cn'
import { statsQuery } from '@/lib/queries'

type Props = {
  current: string
}

// Grace period before a mouse-leave actually closes the panel — long enough that
// crossing onto the scrollbar or overshooting slightly while moving the pointer
// toward it to scroll doesn't get read as "left".
const HOVER_CLOSE_DELAY_MS = 1000

/**
 * "?" info button next to a record's fuel value. The full fuel breakdown lives in the
 * (already-fetched-elsewhere, staleTime: Infinity) /api/stats response, so this only
 * triggers its own fetch — `enabled: <visible>` — the first time it's actually opened.
 *
 * Hovering and clicking are tracked separately (`hovering` vs `pinned`, `visible = either`).
 * A real click always fires `mouseenter` first, so a click handler that *toggles* a single
 * `open` flag re-closes itself on every click (hover opens it, then the click's own toggle
 * flips it straight back off). Pinning keeps the panel open after the pointer leaves —
 * needed for touch, where there is no hover at all, and for the explicit close button (it
 * clears both flags so hovering it while pinned can't keep the panel stuck open).
 */
export default function FuelInfoButton({ current }: Props): ReactNode {
  const { t } = useTranslation()
  const [hovering, setHovering] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = hovering || pinned
  const containerRef = useRef<HTMLSpanElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const stats = useQuery({ ...statsQuery(), enabled: visible })

  function cancelScheduledClose(): void {
    if (closeTimeoutRef.current === null) return
    window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }

  function scheduleClose(): void {
    cancelScheduledClose()
    closeTimeoutRef.current = window.setTimeout(() => setHovering(false), HOVER_CLOSE_DELAY_MS)
  }

  useEffect(() => cancelScheduledClose, [])

  useEffect(() => {
    if (!pinned) return
    function handlePointerDown(e: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPinned(false)
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setPinned(false)
        setHovering(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pinned])

  function handleClose(): void {
    cancelScheduledClose()
    setPinned(false)
    setHovering(false)
  }

  // Known fuels first (most common first). The unknown/absent/garbage markers ("NULL",
  // "ВІДСУТНЄ", ".", a blank value) are a source-data artifact, not a meaningful fuel
  // distinction, so they're merged into one "not specified" row at the bottom rather
  // than shown as five near-duplicate rows.
  const allRows = stats.data?.byFuel ?? []
  const known = allRows
    .filter(row => isKnownFuel(row.value))
    .map(row => ({ value: row.value, icon: getFuelIcon(row.value), totalRows: row.totalRows, isCurrent: row.value === current }))
    .sort((a, b) => b.totalRows - a.totalRows)
  const unknownTotal = allRows.filter(row => !isKnownFuel(row.value)).reduce((sum, row) => sum + row.totalRows, 0)
  const rows =
    unknownTotal > 0
      ? [...known, { value: null, icon: FUEL_ICON_FALLBACK, totalRows: unknownTotal, isCurrent: !isKnownFuel(current) }]
      : known

  return (
    <span
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        cancelScheduledClose()
        setHovering(true)
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelScheduledClose()
        setHovering(true)
      }}
      onBlur={() => setHovering(false)}
    >
      <button
        type="button"
        aria-label={t('field.fuelInfo')}
        aria-expanded={visible}
        onClick={() => setPinned(v => !v)}
        className="text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        ❓
      </button>

      {/* The pt-1 gap (rather than a top margin on the panel below) keeps the hoverable
          area contiguous with the button — a margin would leave a dead strip the pointer
          has to cross, which drops the hover state before it ever reaches the panel. */}
      {visible && (
        <div className="absolute top-full right-0 z-10 pt-1">
          <div
            role="tooltip"
            className="max-h-64 w-[26rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm shadow-lg"
          >
            <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
              <span className="font-semibold">{t('field.fuelInfoTitle')}</span>
              <button
                type="button"
                aria-label={t('field.fuelInfoClose')}
                onClick={handleClose}
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                ✕
              </button>
            </div>
            {stats.isPending && <p className="px-1.5 text-[var(--color-muted)]">{t('result.loading')}</p>}
            {stats.isError && <p className="px-1.5 text-[var(--color-muted)]">{t('result.error')}</p>}
            <ul className="flex flex-col gap-0.5">
              {rows.map(row => (
                <li
                  key={row.value ?? ''}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded px-1.5 py-1 whitespace-nowrap',
                    row.isCurrent && 'bg-[var(--color-primary)]/15 font-medium'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden>{row.icon}</span>
                    {row.value || t('field.fuelUnknown')}
                  </span>
                  <span className="text-[var(--color-muted)]">{row.totalRows.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </span>
  )
}
