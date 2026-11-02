import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { buildPageShareUrl } from '@/components/use-page-share-actions'
import { cn } from '@/lib/cn'

const ShareQr = lazy(() => import('@/components/ShareQr'))

type Props = {
  /** `chip`: opens above / below the button; `floating` (the round side buttons): opens beside it. */
  variant: 'chip' | 'floating'
  className: string
  tabIndex?: number
}

type Open = { url: string; placement: string }

// Popover is ~176px of QR + padding + a two-line hint; the sticky header is 56px.
const POPOVER_HEIGHT_PX = 270
const POPOVER_WIDTH_PX = 210
const HEADER_PX = 64

/** Where the popover goes so that it stays inside the viewport (measured when it opens). */
function placePopover(rect: DOMRect, variant: Props['variant']): string {
  if (variant === 'floating') {
    const side = rect.left > POPOVER_WIDTH_PX + 16 ? 'right-full mr-2' : 'left-full ml-2'
    const mid = rect.top + rect.height / 2
    const vertical =
      mid + POPOVER_HEIGHT_PX / 2 > window.innerHeight
        ? 'bottom-0'
        : mid - POPOVER_HEIGHT_PX / 2 < HEADER_PX
          ? 'top-0'
          : 'top-1/2 -translate-y-1/2'
    return `${side} ${vertical}`
  }
  const vertical =
    window.innerHeight - rect.bottom < POPOVER_HEIGHT_PX && rect.top > POPOVER_HEIGHT_PX
      ? 'bottom-full mb-2'
      : 'top-full mt-2'
  const mid = rect.left + rect.width / 2
  const horizontal =
    mid < POPOVER_WIDTH_PX / 2
      ? 'left-0'
      : mid > window.innerWidth - POPOVER_WIDTH_PX / 2
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2'
  return `${vertical} ${horizontal}`
}

/** Button that shows the current page's link as a QR (for a phone to scan) in a popover kept inside the viewport. */
export default function ShareQrButton({ variant, className, tabIndex }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Open | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const isOpen = open !== null

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(null)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const toggle = (e: MouseEvent<HTMLButtonElement>): void => {
    if (isOpen) {
      setOpen(null)
      return
    }
    setOpen({
      url: buildPageShareUrl(),
      placement: placePopover(e.currentTarget.getBoundingClientRect(), variant)
    })
  }

  return (
    <span ref={wrapRef} className={cn('relative', variant === 'chip' ? 'inline-flex' : 'flex')}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={t('share.qr')}
        title={t('share.qr')}
        tabIndex={tabIndex}
        onClick={toggle}
        className={className}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={variant === 'chip' ? 'h-3.5 w-3.5 shrink-0' : 'size-6'}
          fill="none"
          stroke="currentColor"
          strokeWidth={variant === 'chip' ? 2 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17 20h.01" />
        </svg>
        {variant === 'chip' && 'QR'}
      </button>
      {open && (
        <div
          className={cn(
            'pointer-events-auto absolute z-30 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg',
            open.placement
          )}
        >
          <Suspense fallback={<div className="h-44 w-44" />}>
            <ShareQr url={open.url} label={t('share.qr')} />
          </Suspense>
          <p className="mt-2 w-44 text-center text-xs text-[var(--color-muted)]">{t('share.qrHint')}</p>
        </div>
      )}
    </span>
  )
}
