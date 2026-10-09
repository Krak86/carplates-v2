import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { blueskyQuery } from '@/lib/bluesky'
import { type CommunityPost, lemmyQuery, stackExchangeQuery } from '@/lib/community'
import { newsLangFilter } from '@/lib/news'
import { newsQuery } from '@/lib/queries'

/** Room for the card (700px) plus two 240px columns on each side. Narrower desktops get the first column only. */
export const SECOND_COLUMN_QUERY = '(min-width: 1760px)'
/** The second-column widgets follow the first ones after this pause. */
export const SECOND_COLUMN_DELAY_MS = 1000

export type CommunitySlot = { posts: CommunityPost[]; moreUrl: string | undefined }

type Result = {
  /** Lemmy (left) / Q&A (right) when they take the first slot — the Bluesky / news widget has nothing to show. */
  leftFirst: CommunitySlot | null
  rightFirst: CommunitySlot | null
  /** Lemmy / Q&A beside the first-column widget, after the delay and only on very wide screens. */
  leftSecond: CommunitySlot | null
  rightSecond: CommunitySlot | null
}

const EMPTY: Result = { leftFirst: null, rightFirst: null, leftSecond: null, rightSecond: null }

/**
 * Placement of the Lemmy and Mechanics-Q&A side widgets. Left column: Bluesky, then Lemmy beside it — or in its place
 * when Bluesky found nothing. Right column: news, then Q&A beside it — or in its place when there is no news. Waits
 * until Bluesky / news have settled so a slot never flips, and shares their queries (no extra requests).
 */
export function useSideCommunity(
  active: boolean,
  brand: string | undefined,
  model: string | null,
  year: number | null,
  withBluesky: boolean
): Result {
  const { i18n } = useTranslation()
  const isWide = useMediaQuery(SECOND_COLUMN_QUERY)
  const [delayed, setDelayed] = useState(false)
  const enabled = active && !!brand

  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => setDelayed(true), SECOND_COLUMN_DELAY_MS)
    return (): void => clearTimeout(timer)
  }, [enabled])

  const bluesky = useQuery({ ...blueskyQuery(brand ?? '', model, year), enabled: enabled && withBluesky })
  const news = useQuery({ ...newsQuery(brand, model, year, newsLangFilter(i18n.language)), enabled })
  const lemmy = useQuery({ ...lemmyQuery(brand ?? '', model), enabled })
  const qa = useQuery({ ...stackExchangeQuery(brand ?? '', model), enabled })

  if (!enabled) return EMPTY

  const blueskySettled = !withBluesky || !bluesky.isPending
  const hasBluesky = withBluesky && (bluesky.data?.posts.length ?? 0) > 0
  const hasNews = (news.data?.items.length ?? 0) > 0
  const lemmySlot: CommunitySlot | null = lemmy.data?.posts.length
    ? { posts: lemmy.data.posts, moreUrl: lemmy.data.searchUrl }
    : null
  const qaSlot: CommunitySlot | null = qa.data?.posts.length
    ? { posts: qa.data.posts, moreUrl: qa.data.searchUrl }
    : null

  return {
    leftFirst: blueskySettled && !hasBluesky ? lemmySlot : null,
    rightFirst: !news.isPending && !hasNews ? qaSlot : null,
    leftSecond: blueskySettled && hasBluesky && isWide && delayed ? lemmySlot : null,
    rightSecond: !news.isPending && hasNews && isWide && delayed ? qaSlot : null
  }
}
