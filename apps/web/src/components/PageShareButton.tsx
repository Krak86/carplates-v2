import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { usePageShareActions } from '@/components/use-page-share-actions'

type Props = {
  title: string
}

/** Chip that shares the current page's link (native share sheet, else clipboard). The link carries the sharer's language. */
export default function PageShareButton({ title }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, share } = usePageShareActions(title)

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
        <path d="M12 3v12M8 7l4-4 4 4" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      </svg>
      <span aria-live="polite">{copied ? t('share.copied') : t('share.page')}</span>
    </button>
  )
}
