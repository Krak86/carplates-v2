import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CopyIcon from '@/components/CopyIcon'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { cn } from '@/lib/cn'

type Props = {
  text: string
  label: string
  className?: string
}

/** Copies `text` (a plate or VIN) to the clipboard, swapping the icon to a
 *  checkmark and announcing "Copied!" for screen readers for a couple seconds. */
export default function CopyButton({ text, label, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, copy } = useCopyFeedback()

  return (
    <button
      type="button"
      title={t('copy.button', { label })}
      aria-label={t('copy.button', { label })}
      onClick={() => copy(text)}
      className={cn(
        'inline-flex shrink-0 items-center text-[var(--color-muted)] hover:text-[var(--color-primary)]',
        className
      )}
    >
      <span aria-hidden>{copied ? '✅' : <CopyIcon />}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? t('copy.copied') : ''}
      </span>
    </button>
  )
}
