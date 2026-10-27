import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import CopyButton from '@/components/CopyButton'
import { useCopyFeedback } from '@/components/use-copy-feedback'

type Props = {
  vin: string
  siteName: string
  url: string
  onClose: () => void
  /** Overrides for non-VIN reuse (e.g. a plate): the copy label and the three texts. */
  copyLabel?: string
  title?: string
  step1?: string
  step2?: string
}

/**
 * Shown for auction sites that cannot take a VIN in the URL: the VIN to copy, a hint to paste it into the site's own
 * search box, and the link. Portaled — the result Card's 3D tilt transform would otherwise contain `position: fixed`.
 */
export default function AuctionVinModal({
  vin,
  siteName,
  url,
  onClose,
  copyLabel = 'VIN',
  title,
  step1,
  step2
}: Props): ReactNode {
  const { t } = useTranslation()
  const feedback = useCopyFeedback()

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={siteName}
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-semibold">{title ?? t('auctions.modal.title', { site: siteName })}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('auctions.modal.close')}
            className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            ✕
          </button>
        </div>

        <p className="mb-2 text-sm text-[var(--color-muted)]">{step1 ?? t('auctions.modal.step1')}</p>
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
          <code className="font-mono text-base break-all select-all">{vin}</code>
          <CopyButton text={vin} label={copyLabel} feedback={feedback} />
        </div>

        <p className="mb-3 text-sm text-[var(--color-muted)]">
          {step2 ?? t('auctions.modal.step2', { site: siteName })}
        </p>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => feedback.copy(vin)}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-base text-white"
        >
          {t('auctions.modal.open', { site: siteName })} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
        </a>
      </div>
    </div>,
    document.body
  )
}
