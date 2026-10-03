import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { reviewLinks } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

import InfocarReviewRows from '@/components/InfocarReviewRows'
import { REVIEW_SITE_LABEL } from '@/components/ReviewLinks.helpers'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { reviewsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Reviews & test drives" section: exact infocar.ua pages from the crawled catalog (fetched once the
 * section is opened) plus search links to the other review sites. Hidden for a car with no make/model to go on.
 */
export default function ReviewLinks({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedReviews = searchParams.get('section') === 'reviews'
  const [open, setOpen] = useState(() => isSharedReviews)
  const sectionRef = useRef<HTMLDivElement>(null)
  const links = reviewLinks(brand, model)
  const hasLinks = links.length > 0
  const catalog = useQuery({ ...reviewsQuery(brand ?? '', model ?? '', year), enabled: !!brand && open })

  useEffect(() => {
    if (isSharedReviews && hasLinks && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedReviews, hasLinks])

  if (!hasLinks) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-1.5 text-base font-semibold">
          {t('reviews.title')}
          <SectionInfo section="reviews" title={t('reviews.title')} />
        </span>

        <div className="flex items-center gap-1.5">
          {open && <ShareButton section="reviews" label={t('share.button', { section: t('reviews.title') })} />}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
          >
            <span aria-hidden className="no-underline">
              📝
            </span>
            <span className="underline group-hover:no-underline">{open ? t('reviews.hide') : t('reviews.show')}</span>
            <span
              aria-hidden
              className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-3 space-y-1.5">
            {catalog.data?.testDrive && (
              <InfocarReviewRows
                label={t('reviews.infocarTestDrives')}
                brand={brand ?? ''}
                match={catalog.data.testDrive}
              />
            )}

            {catalog.data?.reviews && (
              <InfocarReviewRows
                label={t('reviews.infocarOwnerReviews')}
                brand={brand ?? ''}
                match={catalog.data.reviews}
              />
            )}

            {links.map(link => (
              <li key={link.site}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-base text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)]/40"
                >
                  <span className="flex items-center gap-2">
                    {link.site === 'drive2' && (
                      <img src="/icons/drive2.png" alt="" width={20} height={20} className="size-5 rounded-sm" />
                    )}
                    <span className="underline">{REVIEW_SITE_LABEL[link.site]}</span>
                    {link.lang === 'ru' && (
                      <span
                        title={t('reviews.ruHint')}
                        className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
                      >
                        RU
                      </span>
                    )}
                  </span>
                  <span aria-hidden>↗</span>
                  <span className="sr-only">{t('field.opensNewTab')}</span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('reviews.source')}</p>
        </div>
      </div>
    </div>
  )
}
