import type { ReactNode } from 'react'
import type { BrandPronunciationAudio } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { ipaLangName } from './helpers'
import { useBrandPronounceActions } from './use-brand-pronounce-actions'

type Props = { audio: BrandPronunciationAudio }

/** Play button for the origin-language clip, with its language and the Commons credit (author, licence). */
export default function BrandAudio({ audio }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { playing, failed, toggle } = useBrandPronounceActions(audio.url)
  const lang = ipaLangName(audio.lang, i18n.language)
  const credit = [audio.author, audio.license].filter(Boolean).join(', ')

  return (
    <div className="mt-2 border-t border-[var(--color-border)] pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          {playing ? <path d="M7 6h4v12H7zM13 6h4v12h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
        {lang ? t('brandPronounce.listenIn', { lang }) : t('brandPronounce.listen')}
      </button>
      {failed && <p className="text-xs text-[var(--color-muted)]">{t('brandPronounce.audioError')}</p>}
      {credit && <p className="mt-1 text-xs text-[var(--color-muted)]">{t('brandPronounce.credit', { credit })}</p>}
    </div>
  )
}
