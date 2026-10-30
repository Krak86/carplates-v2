import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionInfo from '@/components/SectionInfo'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import i18n from '@/i18n'
import { setFontParam } from '@/store/ui-store'

import { compareShareParams, readableQuery, sectionAnchor } from './compare-share'
import type { CompareSectionId, ShareState } from './compare-share'

type Props = {
  section: CompareSectionId
  title: string
  /** The tab choices the link carries (the size section's view / layout / style, the table's filter). */
  state?: ShareState
}

/** A section heading (the anchor of its `aria-labelledby`) with a button that copies a link to just this section. */
export default function CompareSectionHeading({ section, title, state = {} }: Props): ReactNode {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { copied, copy } = useCopyFeedback()

  const handleShare = (): void => {
    const next = compareShareParams(params, section, state, i18n.language)
    setFontParam(next)
    copy(`${window.location.origin}/compare?${readableQuery(next)}`)
  }

  return (
    <div className="mb-1 flex items-center gap-2">
      <h2 id={sectionAnchor(section)} className="text-lg font-semibold">
        {title}
      </h2>
      <SectionInfo section={`compare.${section}`} title={title} />
      <button
        type="button"
        title={t('compare.share.section')}
        aria-label={t('compare.share.section')}
        onClick={handleShare}
        className="flex items-center rounded-full bg-[var(--color-surface)]/20 px-2 py-0.5 text-sm text-[var(--color-primary)]"
      >
        <span aria-hidden>{copied ? '✅' : '🔗'}</span>
        <span className="sr-only" aria-live="polite">
          {copied ? t('share.copied') : ''}
        </span>
      </button>
    </div>
  )
}
