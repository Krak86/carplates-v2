import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import Spinner from '@/components/ui/Spinner'

const BrandPronounceBody = lazy(() => import('@/components/brand-pronounce/BrandPronounceBody'))

type Props = {
  /** Catalog make slug (`bmw`). */
  slug: string
  /** Display name of the make. */
  name: string
}

/** Speaker button beside a make name: opens a popover with the ua / ru / en respelling and IPA (fetched and code-split on first open). */
export default function BrandPronounce({ slug, name }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <InfoPopover
      label={t('brandPronounce.label', { name })}
      title={t('brandPronounce.title', { name })}
      triggerClassName="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
      trigger={
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
        </svg>
      }
    >
      <Suspense fallback={<Spinner />}>
        <BrandPronounceBody slug={slug} />
      </Suspense>
    </InfoPopover>
  )
}
