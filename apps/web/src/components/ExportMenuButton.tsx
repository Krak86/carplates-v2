import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner'
import type { ExportFormat } from '@/lib/export-report'
import { cn } from '@/lib/cn'

type Props = {
  formats: readonly ExportFormat[]
  formatLabelKey: Readonly<Record<ExportFormat, string>>
  label: string
  pending: boolean
  onPick: (format: ExportFormat) => Promise<boolean>
  className?: string
  /** Icon shown at rest — a plain clipboard by default, callers with a different primary
   *  action (e.g. a records list export) can swap it for something more specific. */
  icon?: string
}

const MENU_WIDTH = 220
const VIEWPORT_MARGIN = 16
const COPIED_FEEDBACK_MS = 1600

type Placement = { left: number; top?: number; bottom?: number }

/**
 * Click-to-open menu (not InfoPopover's hover-to-open, since every item here triggers an
 * action rather than just displaying content) offering a clipboard copy plus file downloads.
 * Portaled to `document.body` and positioned from the button's own rect, same rationale as
 * InfoPopover: an ancestor's `overflow-hidden` would otherwise clip the menu.
 */
export default function ExportMenuButton({
  formats,
  formatLabelKey,
  label,
  pending,
  onPick,
  className,
  icon = '📋'
}: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useLayoutEffect(() => (): void => clearTimeout(copiedTimeoutRef.current), [])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPlacement(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN
    const spaceAbove = rect.top - VIEWPORT_MARGIN
    const openAbove = spaceAbove > spaceBelow && spaceBelow < 260

    let left = rect.right - MENU_WIDTH
    left = Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)
    left = Math.max(left, VIEWPORT_MARGIN)

    setPlacement({ left, ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) })
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent): void {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handlePick(format: ExportFormat): Promise<void> {
    setOpen(false)
    const ok = await onPick(format)
    if (format === 'clipboard' && ok) {
      setCopied(true)
      clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={pending}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'inline-flex shrink-0 items-center text-base text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60',
          className
        )}
      >
        {pending ? <Spinner /> : <span aria-hidden>{copied ? '✅' : icon}</span>}
        <span className="sr-only" aria-live="polite">
          {copied ? t('share.copied') : ''}
        </span>
      </button>

      {open &&
        placement &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ left: placement.left, top: placement.top, bottom: placement.bottom, width: MENU_WIDTH }}
            className="fixed z-50 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-sm shadow-lg"
          >
            {formats.map(format => (
              <button
                key={format}
                type="button"
                role="menuitem"
                onClick={() => void handlePick(format)}
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-[var(--color-border)]/40"
              >
                {t(formatLabelKey[format])}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
