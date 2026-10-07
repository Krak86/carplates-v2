import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import BlueskyPostCard from '@/components/BlueskyPostCard'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SIDE_WIDGETS_DESKTOP_QUERY, useSideWidgetsVisible } from '@/hooks/useSideWidgetsVisible'
import { blueskyQuery } from '@/lib/bluesky'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Social" section under the news (shareable via `?section=social`): one labelled group per social network
 * (Bluesky for now — add the next network as another group). Each group is every public post found about the car's
 * make/model in a sideways-scrolling row like the videos strip, plus a "more" link to the network's own search. Same
 * query as the left-hand side widget (one request); on wide screens it waits for the first scroll like the news section.
 * Hidden for a car with no make or no posts.
 */
export default function SocialSection({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'social'
  const sectionRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const widgetsVisible = useSideWidgetsVisible()
  const posts = useQuery({
    ...blueskyQuery(brand ?? '', model, year),
    enabled: !!brand && (!isDesktop || widgetsVisible || isShared)
  })
  const items = posts.data?.posts ?? []
  const hasPosts = items.length > 0

  useEffect(() => {
    if (isShared && hasPosts && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, hasPosts])

  if (!brand || !hasPosts) return null

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="💬"
      title={t('social.title')}
      info={<SectionInfo section="social" title={t('social.title')} />}
      actions={<ShareButton section="social" label={t('share.button', { section: t('social.title') })} />}
      showLabel={t('social.show')}
      hideLabel={t('social.hide')}
      defaultOpen={isShared}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2.5 py-0.5 text-sm font-medium">
          <span aria-hidden>🦋</span> {t('bluesky.title')}
        </span>
      </div>

      <ul className="flex items-start gap-3 overflow-x-auto pb-2">
        {items.map(post => (
          <li key={post.id} className="w-64 shrink-0">
            <BlueskyPostCard post={post} />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-muted)]">{t('social.disclaimer')}</p>

        <a
          href={posts.data?.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-2 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          {t('bluesky.more')} <span aria-hidden>↗</span>
        </a>
      </div>
    </VinToggleSection>
  )
}
