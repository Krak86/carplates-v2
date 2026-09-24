import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  label: string
  title: string
  children: ReactNode
}

// Same timing as FieldInfoButton, whose hover/pin logic this mirrors for static content.
const HOVER_CLOSE_DELAY_MS = 1000
const HOVER_OPEN_DELAY_MS = 400

const PANEL_WIDTH = 320 // w-80
const PANEL_MAX_HEIGHT = 320 // max-h-80
const VIEWPORT_MARGIN = 16

type Placement = { left: number; top?: number; bottom?: number; maxHeight: number }

/**
 * "?" button that opens a static explanatory panel on hover or click/tap — a
 * content-agnostic sibling of FieldInfoButton (which is stats-query-driven).
 *
 * The panel is portaled to `document.body` and positioned with `fixed` coordinates
 * computed from the button's own bounding rect, clamped to the viewport — rendering
 * it inline (`absolute` inside the trigger) let any ancestor's `overflow: hidden`
 * (e.g. ResultCard's clipped watermark layer) truncate it before you could scroll
 * to the rest of it. Flips to open upward, and shrinks `max-height` to whatever
 * space is actually available in whichever direction it opens, so it can never
 * extend past the viewport edge.
 */
export default function InfoPopover({ label, title, children }: Props): ReactNode {
  const { t } = useTranslation()
  const [hovering, setHovering] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = hovering || pinned
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const openTimeoutRef = useRef<number | null>(null)

  function cancelScheduledClose(): void {
    if (closeTimeoutRef.current === null) return
    window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }

  function scheduleClose(): void {
    cancelScheduledClose()
    closeTimeoutRef.current = window.setTimeout(() => setHovering(false), HOVER_CLOSE_DELAY_MS)
  }

  function cancelScheduledOpen(): void {
    if (openTimeoutRef.current === null) return
    window.clearTimeout(openTimeoutRef.current)
    openTimeoutRef.current = null
  }

  function scheduleOpen(): void {
    cancelScheduledOpen()
    openTimeoutRef.current = window.setTimeout(() => setHovering(true), HOVER_OPEN_DELAY_MS)
  }

  function handlePointerEnter(): void {
    cancelScheduledClose()
    scheduleOpen()
  }

  function handlePointerLeave(): void {
    cancelScheduledOpen()
    scheduleClose()
  }

  function handleClose(): void {
    cancelScheduledClose()
    cancelScheduledOpen()
    setPinned(false)
    setHovering(false)
  }

  useLayoutEffect(
    () => (): void => {
      cancelScheduledClose()
      cancelScheduledOpen()
    },
    []
  )

  useLayoutEffect(() => {
    if (!visible || !buttonRef.current) {
      setPlacement(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN
    const spaceAbove = rect.top - VIEWPORT_MARGIN
    const openAbove = spaceAbove > spaceBelow

    let left = rect.left
    left = Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN)
    left = Math.max(left, VIEWPORT_MARGIN)

    setPlacement({
      left,
      maxHeight: Math.min(PANEL_MAX_HEIGHT, openAbove ? spaceAbove : spaceBelow),
      ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 })
    })
  }, [visible])

  useLayoutEffect(() => {
    if (!visible) return
    // The panel is fixed-positioned from a one-time measurement, so a scroll
    // anywhere ELSE on the page would visually detach it from its button —
    // close it then; reopening re-measures. Scrolling inside the panel's own
    // (scroll events don't bubble, but this capture-phase listener still sees
    // them) `overflow-y-auto` content must NOT count as "elsewhere".
    function handleScroll(e: Event): void {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      handleClose()
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleClose)
    return (): void => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleClose)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is stable enough for this listener's lifetime
  }, [visible])

  useLayoutEffect(() => {
    if (!pinned) return
    function handlePointerDown(e: PointerEvent): void {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setPinned(false)
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is stable enough for this listener's lifetime
  }, [pinned])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={visible}
        onClick={() => setPinned(v => !v)}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={() => {
          cancelScheduledClose()
          cancelScheduledOpen()
          setHovering(true)
        }}
        onBlur={() => {
          cancelScheduledOpen()
          setHovering(false)
        }}
        className="text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        ❓
      </button>

      {visible &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            style={{ left: placement.left, top: placement.top, bottom: placement.bottom, width: PANEL_WIDTH }}
            className="fixed z-50 max-w-[calc(100vw-2rem)]"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
          >
            <div
              role="tooltip"
              style={{ maxHeight: placement.maxHeight }}
              className="overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm shadow-lg"
            >
              <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
                <span className="font-semibold">{title}</span>
                <button
                  type="button"
                  aria-label={t('field.infoClose')}
                  onClick={handleClose}
                  className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  ✕
                </button>
              </div>
              <div className="px-1.5">{children}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
