import { lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { newsLangFilter } from '@/lib/news'
import { newsQuery } from '@/lib/queries'

const NewsTicker = lazy(() => import('@/components/NewsTicker'))

/** Mounted by `LazySection`, so its query and chunk start only once the section nears the viewport. */
export default function HomeNewsSection(): ReactNode {
  const { i18n } = useTranslation()
  const latestNews = useQuery(newsQuery(undefined, null, null, newsLangFilter(i18n.language)))

  if (!latestNews.data?.items.length) return null

  return (
    <LoadErrorBoundary compact>
      <div className="section-vt w-full max-w-6xl">
        <NewsTicker items={latestNews.data.items} />
      </div>
    </LoadErrorBoundary>
  )
}
