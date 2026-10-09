import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import BlueskyPostCard from '@/components/BlueskyPostCard'
import CommunityPostCard from '@/components/CommunityPostCard'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import SocialGroup from '@/components/SocialGroup'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { blueskyQuery } from '@/lib/bluesky'
import { lemmyQuery, stackExchangeQuery } from '@/lib/community'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Social" section under the news (shareable via `?section=social`): one labelled group per source —
 * Bluesky posts plus Stack Exchange (Mechanics) and Lemmy threads, all keyless browser-side searches. Each group is a
 * sideways-scrolling row like the videos strip, plus a "more" link to the source's own search. The Bluesky query is
 * shared with the left-hand side widget (one request). All three searches run only once the section is opened.
 * Hidden for a car with no make.
 */
export default function SocialSection({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'social'
  const sectionRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(() => isShared)
  // Fetched only once opened; on wide screens the Bluesky query is shared with the side widget.
  const enabled = !!brand && open
  const blueskyPosts = useQuery({ ...blueskyQuery(brand ?? '', model, year), enabled })
  const stackPosts = useQuery({ ...stackExchangeQuery(brand ?? '', model), enabled })
  const lemmyPosts = useQuery({ ...lemmyQuery(brand ?? '', model), enabled })
  const bluesky = blueskyPosts.data?.posts ?? []
  const stack = stackPosts.data?.posts ?? []
  const lemmy = lemmyPosts.data?.posts ?? []
  const hasPosts = bluesky.length + stack.length + lemmy.length > 0

  const isLoading = blueskyPosts.isLoading || stackPosts.isLoading || lemmyPosts.isLoading
  const isSettled = open && !isLoading && [blueskyPosts, stackPosts, lemmyPosts].every(q => q.isSuccess || q.isError)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!brand) return null

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
      onOpenChange={setOpen}
    >
      {isLoading && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {isSettled && !hasPosts && <p className="text-base text-[var(--color-muted)]">{t('section.empty')}</p>}

      {bluesky.length > 0 && (
        <SocialGroup icon="🦋" title={t('bluesky.title')} moreUrl={blueskyPosts.data?.searchUrl}>
          {bluesky.map(post => (
            <li key={post.id} className="w-64 shrink-0">
              <BlueskyPostCard post={post} />
            </li>
          ))}
        </SocialGroup>
      )}

      {stack.length > 0 && (
        <SocialGroup icon="🔧" title={t('social.stackexchange')} moreUrl={stackPosts.data?.searchUrl}>
          {stack.map(post => (
            <li key={post.id} className="w-64 shrink-0">
              <CommunityPostCard post={post} />
            </li>
          ))}
        </SocialGroup>
      )}

      {lemmy.length > 0 && (
        <SocialGroup icon="🐭" title={t('social.lemmy')} moreUrl={lemmyPosts.data?.searchUrl}>
          {lemmy.map(post => (
            <li key={post.id} className="w-64 shrink-0">
              <CommunityPostCard post={post} />
            </li>
          ))}
        </SocialGroup>
      )}

      {hasPosts && <p className="text-sm text-[var(--color-muted)]">{t('social.disclaimer')}</p>}
    </VinToggleSection>
  )
}
