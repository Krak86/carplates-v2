import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Skeleton from '@/components/ui/Skeleton'
import { scrollElementIntoView } from '@/lib/share-section'
import ArticleHeader from '@/routes/read/ArticleHeader'
import { BODY_TYPES_LEAD } from '@/routes/read/articles'
import BodyShare from '@/routes/read/body-types/BodyShare'
import { EXPLAINED_SHAPES, QUIRK } from '@/routes/read/body-types/content'
import ShapeCard from '@/routes/read/body-types/ShapeCard'
import SuvVsCrossover from '@/routes/read/body-types/SuvVsCrossover'
import { parseOneOf, pick } from '@/routes/read/helpers'
import { shapeAnchor } from '@/routes/read/links'
import { useSizeProfiles } from '@/routes/read/use-size-profiles'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function BodyTypesRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const { find, isPending, isError } = useSizeProfiles()
  const shape = parseOneOf(searchParams.get('shape'), EXPLAINED_SHAPES)

  // `?shape=` (from the plate card) scrolls to that card once the cards, and the models in them, are in.
  useEffect(() => {
    if (!shape || isPending) return
    const el = document.getElementById(shapeAnchor(shape))
    if (el) scrollElementIntoView(el)
  }, [shape, isPending])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readBodyTypes')}
        lead={pick(BODY_TYPES_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'types', label: t('read.sec.types') },
          { id: 'suv', label: t('read.sec.suv') },
          { id: 'share', label: t('read.sec.share') }
        ]}
      />

      <section id="types" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold">{t('read.sec.types')}</h2>
        <p className="text-sm text-muted">{pick(QUIRK, i18n.language)}</p>

        {isPending && <Skeleton className="h-64 w-full rounded-xl" />}
        {isError && <p className="text-muted">{t('read.loadError')}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          {EXPLAINED_SHAPES.map(s => (
            <ShapeCard key={s} shape={s} highlighted={s === shape} find={find} />
          ))}
        </div>
      </section>

      <SuvVsCrossover find={find} />

      <BodyShare />
    </div>
  )
}
