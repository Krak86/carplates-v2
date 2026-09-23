import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { StatsByDimensionRow, StatsResponse } from '@carplates/shared'

import { FUEL_ICON_FALLBACK, getFuelIcon, isKnownFuel } from '@/components/ResultCard.helpers'
import { cn } from '@/lib/cn'
import { statsQuery } from '@/lib/queries'

export type FieldInfoDimension = 'body' | 'kind' | 'color' | 'fuel'

type Props = {
  dimension: FieldInfoDimension
  current: string | null
}

// Grace period before a mouse-leave actually closes the panel — long enough that
// crossing onto the scrollbar or overshooting slightly while moving the pointer
// toward it to scroll doesn't get read as "left".
const HOVER_CLOSE_DELAY_MS = 1000

type DimensionConfig = {
  getRows: (stats: StatsResponse) => StatsByDimensionRow[]
  // Only `fuel` has a per-value icon (keyword-matched, ResultCard.helpers.ts) and a
  // known/unknown split (its unknown/absent/garbage source markers collapse into one
  // row). `body`/`kind`/`color` don't have that classification yet — plain list, no icons.
  getIcon?: (value: string | null | undefined) => string
  isKnown?: (value: string | null | undefined) => boolean
  unknownIcon?: string
}

const DIMENSION_CONFIG: Readonly<Record<FieldInfoDimension, DimensionConfig>> = {
  body: { getRows: stats => stats.byBody },
  kind: { getRows: stats => stats.byKind },
  color: { getRows: stats => stats.byColor },
  fuel: { getRows: stats => stats.byFuel, getIcon: getFuelIcon, isKnown: isKnownFuel, unknownIcon: FUEL_ICON_FALLBACK }
}

/**
 * "?" info button next to a record's field value. The full breakdown for that field lives
 * in the (already-fetched-elsewhere, staleTime: Infinity) /api/stats response, so this only
 * triggers its own fetch — `enabled: <visible>` — the first time it's actually opened.
 *
 * Hovering and clicking are tracked separately (`hovering` vs `pinned`, `visible = either`).
 * A real click always fires `mouseenter` first, so a click handler that *toggles* a single
 * `open` flag re-closes itself on every click (hover opens it, then the click's own toggle
 * flips it straight back off). Pinning keeps the panel open after the pointer leaves —
 * needed for touch, where there is no hover at all, and for the explicit close button (it
 * clears both flags so hovering it while pinned can't keep the panel stuck open).
 */
export default function FieldInfoButton({ dimension, current }: Props): ReactNode {
  const { t } = useTranslation()
  const [hovering, setHovering] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = hovering || pinned
  const containerRef = useRef<HTMLSpanElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const stats = useQuery({ ...statsQuery(), enabled: visible })
  const config = DIMENSION_CONFIG[dimension]
  const fieldLabel = t(`field.${dimension}`)

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

  const isKnown = config.isKnown ?? ((): boolean => true)
  const allRows = stats.data ? config.getRows(stats.data) : []
  const known = allRows
    .filter(row => isKnown(row.value))
    .map(row => ({ value: row.value, icon: config.getIcon?.(row.value), totalRows: row.totalRows, isCurrent: row.value === current }))
    .sort((a, b) => b.totalRows - a.totalRows)
  const unknownTotal = allRows.filter(row => !isKnown(row.value)).reduce((sum, row) => sum + row.totalRows, 0)
  const rows =
    unknownTotal > 0
      ? [...known, { value: null, icon: config.unknownIcon, totalRows: unknownTotal, isCurrent: !isKnown(current) }]
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
        aria-label={t('field.info', { field: fieldLabel })}
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
            className="max-h-64 w-136 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm shadow-lg"
          >
            <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
              <span className="font-semibold">{t('field.infoTitle', { field: fieldLabel })}</span>
              <button
                type="button"
                aria-label={t('field.infoClose')}
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
                    {row.icon && <span aria-hidden>{row.icon}</span>}
                    {row.value || t('field.unknown')}
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
