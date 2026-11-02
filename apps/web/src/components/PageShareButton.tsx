import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { buildPageShareUrl, usePageShareActions } from '@/components/use-page-share-actions'

const ShareQr = lazy(() => import('@/components/ShareQr'))

type Props = {
  title: string
}

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'

/** Chips that share the current page's link (native share sheet, else clipboard) or show it as a QR for a phone to scan. The link carries the sharer's language. */
export default function PageShareButton({ title }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, share } = usePageShareActions(title)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const open = qrUrl !== null

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) setQrUrl(null)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setQrUrl(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span ref={wrapRef} className="relative inline-flex items-center gap-1.5">
      <button type="button" onClick={() => void share()} className={CHIP_CLASS}>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12M8 7l4-4 4 4" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
        <span aria-live="polite">{copied ? t('share.copied') : t('share.page')}</span>
      </button>
      <button
        type="button"
        aria-expanded={open}
        aria-label={t('share.qr')}
        title={t('share.qr')}
        onClick={() => setQrUrl(open ? null : buildPageShareUrl())}
        className={CHIP_CLASS}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17 20h.01" />
        </svg>
        QR
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg">
          <Suspense fallback={<div className="h-44 w-44" />}>
            <ShareQr url={qrUrl} label={t('share.qr')} />
          </Suspense>
          <p className="mt-2 max-w-44 text-center text-xs text-[var(--color-muted)]">{t('share.qrHint')}</p>
        </div>
      )}
    </span>
  )
}
