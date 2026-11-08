import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useBrandSpeechActions } from './use-brand-speech-actions'

type Props = { speech: { text: string; lang: string } }

/** Fallback for a make with no Commons clip: reads the respelling with the browser's synthetic voice, labelled as such. */
export default function BrandSpeech({ speech }: Props): ReactNode {
  const { t } = useTranslation()
  const { supported, speaking, toggle } = useBrandSpeechActions(speech)
  if (!supported) return null

  return (
    <div className="mt-2 border-t border-[var(--color-border)] pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={speaking}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          {speaking ? <path d="M7 6h4v12H7zM13 6h4v12h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
        {t('brandPronounce.listen')}
      </button>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{t('brandPronounce.synthetic')}</p>
    </div>
  )
}
