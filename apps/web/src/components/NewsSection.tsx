import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import NewsGroups from '@/components/NewsGroups'
import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SIDE_WIDGETS_DESKTOP_QUERY, useSideWidgetsVisible } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'
import { newsLangFilter } from '@/lib/news'
import { newsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "News" section, last on a result card (same pattern as the other sections, shareable via `?section=news`):
 * the car's model news, then make news. Works on every screen size — the right-hand widget is its desktop-only twin (on desktop both load after the first scroll).
 * Hidden for a car with no make or no news.
 */
export default function NewsSection({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'news'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  // On wide screens the side widget is this section's twin and loads news after the first scroll — so does this section
  // (same query, one request), instead of firing it as soon as the result renders. A shared `?section=news` link loads at once.
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const widgetsVisible = useSideWidgetsVisible()
  const news = useQuery({
    ...newsQuery(brand ?? '', model, year, newsLangFilter(i18n.language)),
    enabled: !!brand && (!isDesktop || widgetsVisible || isShared)
  })
  const items = news.data?.items ?? []
  const hasNews = items.length > 0

  useEffect(() => {
    if (isShared && hasNews && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, hasNews])

  if (!brand || !hasNews) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📰"
        title={t('news.title')}
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
            <NewsGroups items={items} brand={brand} horizontal decorative={!open} />

            <p className="text-sm text-[var(--color-muted)]">{t('news.disclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
