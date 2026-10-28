import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import NewsGroupLabel from '@/components/NewsGroupLabel'
import NewsGroups from '@/components/NewsGroups'
import StockNewsCard from '@/components/StockNewsCard'
import SectionHeader from '@/components/SectionHeader'
import SectionCount from '@/components/SectionCount'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { newsLangFilter } from '@/lib/news'
import { newsQuery, stockNewsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'
import SectionSkeleton from '@/components/ui/SectionSkeleton'

/** Total headlines in the section, split between the car news and the Yahoo Finance group. */
const NEWS_LIMIT = 5
const FINANCE_MIN = 2

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "News" section, last on a result card (same pattern as the other sections, shareable via `?section=news`):
 * the car's model news, then make news. Works on every screen size — the right-hand widget is its desktop-only twin.
 * News is fetched only once the section is opened. Hidden for a car with no make.
 */
export default function NewsSection({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'news'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  // Fetched as soon as the section mounts (near the viewport) so the header can show the count. On wide screens the
  // side widget shares the query key.
  const news = useQuery({
    ...newsQuery(brand ?? '', model, year, newsLangFilter(i18n.language)),
    enabled: !!brand
  })
  const financeNews = useQuery({ ...stockNewsQuery(brand ?? ''), enabled: !!brand })
  const finance = financeNews.data?.items ?? []
  const carItems = news.data?.items ?? []
  // Yahoo gets at least its share of the cap; whatever the car news leaves unused goes to Yahoo too.
  const financeCount = Math.min(finance.length, Math.max(FINANCE_MIN, NEWS_LIMIT - carItems.length))
  const items = carItems.slice(0, NEWS_LIMIT - financeCount)
  const financeShown = finance.slice(0, financeCount)
  const total = items.length + financeShown.length
  const isLoading = news.isLoading || financeNews.isLoading
  const isSettled = (news.isSuccess || news.isError) && (financeNews.isSuccess || financeNews.isError)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!brand) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📰"
        title={
          <>
            {t('news.title')} <SectionCount count={total} />
          </>
        }
        info={<SectionInfo section="news" title={t('news.title')} />}
        actions={<ShareButton section="news" label={t('share.button', { section: t('news.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('news.show')}
        hideLabel={t('news.hide')}
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
          <div className="mt-3 space-y-3">
            {isLoading && <SectionSkeleton />}
            {news.isError && financeNews.isError && (
              <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>
            )}
            {isSettled && total === 0 && !news.isError && (
              <p className="text-base text-[var(--color-muted)]">{t('section.empty')}</p>
            )}

            {total > 0 && (
              <>
                {items.length > 0 && (
                  <div className="space-y-2">
                    <NewsGroupLabel icon="📰" title={t('news.group.car')} />
                    <NewsGroups items={items} brand={brand} horizontal decorative={!open} />
                  </div>
                )}

                {financeShown.length > 0 && (
                  <div className="space-y-2">
                    <NewsGroupLabel
                      icon="💹"
                      title={t('stockNews.title', { name: financeNews.data?.company?.name ?? '' })}
                      moreUrl={financeNews.data?.moreUrl ?? undefined}
                    />

                    <ul className="space-y-2">
                      {financeShown.map(item => (
                        <li key={item.id}>
                          <StockNewsCard item={item} horizontal />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-[var(--color-muted)]">
                  {t('news.disclaimer')}
                  {news.data?.updatedAt &&
                    ` ${t('news.updatedAt', { date: new Date(news.data.updatedAt).toLocaleString(toIntlLocale(i18n.language)) })}`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
