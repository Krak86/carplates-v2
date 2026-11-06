import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopyFeedback } from '@/components/use-copy-feedback'
import { cn } from '@/lib/cn'

import { readableQuery } from './compare-share'
import { formatCompareRef } from './ref'
import type { CompareRef } from './types'

type Props = {
  a: CompareRef
  b: CompareRef
  className?: string
}

/** The share link of the whole comparison: `/compare?a=plate:BE6756HE&b=plate:BC6743PH&lang=ua` (Latin plates, readable). */
export default function CompareShareButton({ a, b, className }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { copied, copy } = useCopyFeedback()

  const handleShare = (): void => {
    const params = new URLSearchParams({ a: formatCompareRef(a), b: formatCompareRef(b), lang: i18n.language })
    copy(`${window.location.origin}/compare?${readableQuery(params)}`)
  }

  return (
    <button
      type="button"
      title={t('compare.share.linkTitle')}
      onClick={handleShare}
      className={cn(
        'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
        className
      )}
    >
      <span aria-hidden>{copied ? '✅ ' : '🔗 '}</span>
      {copied ? t('share.copied') : t('compare.share.link')}
    </button>
  )
}
