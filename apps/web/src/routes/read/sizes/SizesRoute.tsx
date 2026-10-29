import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import Skeleton from '@/components/ui/Skeleton'
import { scrollElementIntoView } from '@/lib/share-section'
import ArticleHeader from '@/routes/read/ArticleHeader'
import { SIZES_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import FitTable from '@/routes/read/sizes/FitTable'
import FleetBySegment from '@/routes/read/sizes/FleetBySegment'
import { HOW } from '@/routes/read/sizes/content'
import SegmentsTable from '@/routes/read/sizes/SegmentsTable'
import SizeExplorer from '@/routes/read/sizes/SizeExplorer'
import { useSizeProfiles } from '@/routes/read/use-size-profiles'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function SizesRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const { hash } = useLocation()
  const { profiles, isPending, isError } = useSizeProfiles()

  // `#explorer` (from the plate card's size chip) lands on the explorer once its rows exist; the browser's own
  // hash scroll runs before they do.
  useEffect(() => {
    if (!hash || isPending) return
    const el = document.getElementById(hash.slice(1))
    if (el) scrollElementIntoView(el)
  }, [hash, isPending])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readSizes')}
        lead={pick(SIZES_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'segments', label: t('read.sec.segments') },
          { id: 'fleet', label: t('read.sec.fleet') },
          { id: 'fit', label: t('read.sec.fit') },
          { id: 'explorer', label: t('read.sec.explorer') }
        ]}
      />

      <p className="px-1 text-sm text-muted">{pick(HOW, i18n.language)}</p>

      {isPending && <Skeleton className="h-64 w-full rounded-xl" />}
      {isError && <p className="text-muted">{t('read.loadError')}</p>}

      {!isPending && !isError && (
        <>
          <SegmentsTable profiles={profiles} />
          <FleetBySegment profiles={profiles} />
          <FitTable profiles={profiles} />
          <SizeExplorer profiles={profiles} />
        </>
      )}
    </div>
  )
}
