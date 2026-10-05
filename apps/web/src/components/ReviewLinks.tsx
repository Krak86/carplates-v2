import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { reviewLinks } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

import EdrivePosts from '@/components/EdrivePosts'
import InfocarReviewRows from '@/components/InfocarReviewRows'
import LangBadge from '@/components/LangBadge'
import PressReviews from '@/components/PressReviews'
import { REVIEW_SITE_LABEL } from '@/components/ReviewLinks.helpers'
import SectionInfo from '@/components/SectionInfo'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import SourceGroup from '@/components/SourceGroup'
import TopgearReviews from '@/components/TopgearReviews'
import { cn } from '@/lib/cn'
import { reviewsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

/** infocar.ua and e-drive.com.ua publish in both Ukrainian and Russian. */
const UA_RU: ('ua' | 'ru')[] = ['ua', 'ru']
/** mezha.ua publishes in Ukrainian and English (itc.ua in Ukrainian and Russian, like infocar). */
const UA_EN: ('ua' | 'en')[] = ['ua', 'en']
/** TopGear UK reviews are English-only. */
const EN: 'en'[] = ['en']

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * One collapsed "Reviews" section (all the text material; videos have their own `VideoReviews` section), grouped by
 * source: infocar.ua (test drives, owner reviews), ITC.ua and Mezha (tech-press test drives), e-drive.com.ua (owner posts), TopGear UK (editorial reviews) and
 * search links to the other review sites. The persisted catalogs are fetched once the section is opened. Hidden for a car with no make/model to go on.
 */
export default function ReviewLinks({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedReviews = searchParams.get('section') === 'reviews'
  const [open, setOpen] = useState(() => isSharedReviews)
  const sectionRef = useRef<HTMLDivElement>(null)
  const links = reviewLinks(brand, model, year)
  const hasLinks = links.length > 0
  const catalog = useQuery({ ...reviewsQuery(brand ?? '', model ?? '', year), enabled: !!brand && open })
  const posts = catalog.data?.ownerPosts ?? []
  const topgear = catalog.data?.topgear ?? []
  const itc = (catalog.data?.press ?? []).filter(r => r.source === 'itc')
  const mezha = (catalog.data?.press ?? []).filter(r => r.source === 'mezha')
  const hasInfocar = !!catalog.data?.testDrive || !!catalog.data?.reviews

  useEffect(() => {
    if (isSharedReviews && hasLinks && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedReviews, hasLinks])

  if (!hasLinks) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📝"
        title={t('reviews.title')}
        info={<SectionInfo section="reviews" title={t('reviews.title')} />}
        actions={<ShareButton section="reviews" label={t('share.button', { section: t('reviews.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('reviews.show')}
        hideLabel={t('reviews.hide')}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-4">
            {hasInfocar && (
              <SourceGroup icon="/icons/infocar.png" name="infocar.ua" langs={UA_RU}>
                <ul className="space-y-1.5">
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
                </ul>
              </SourceGroup>
            )}

            {itc.length > 0 && (
              <SourceGroup icon="/icons/itc.webp" name="ITC.ua" langs={UA_RU}>
                <PressReviews reviews={itc} site="itc.ua" />
              </SourceGroup>
            )}

            {mezha.length > 0 && (
              <SourceGroup icon="/icons/mezha.webp" name="Mezha" langs={UA_EN}>
                <PressReviews reviews={mezha} site="mezha.ua" />
              </SourceGroup>
            )}

            {posts.length > 0 && (
              <SourceGroup icon="/icons/edrive.png" name="e-drive.com.ua" langs={UA_RU}>
                <EdrivePosts posts={posts} />
              </SourceGroup>
            )}

            {topgear.length > 0 && (
              <SourceGroup icon="/icons/topgear.webp" name="TopGear" langs={EN}>
                <TopgearReviews reviews={topgear} />
              </SourceGroup>
            )}

            <SourceGroup name={t('reviews.otherSites')}>
              <ul className="space-y-1.5">
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
                        {link.lang === 'ru' && <LangBadge lang="ru" />}
                      </span>
                      <span aria-hidden>↗</span>
                      <span className="sr-only">{t('field.opensNewTab')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </SourceGroup>
          </div>

          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('reviews.source')}</p>
        </div>
      </div>
    </div>
  )
}
