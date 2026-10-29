import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { pick } from '@/routes/read/helpers'
import { EXAMPLE_LINK_PLATE, SEARCH_INTRO, SEARCH_NOTE, SEARCH_STEPS } from '@/routes/read/plates/content'

type LinksProps = {
  withAr?: boolean
}

/** Links into the app's plate search; reused at the end of several sections. */
export function PlateSearchLinks({ withAr = false }: LinksProps): ReactNode {
  const { t } = useTranslation()

  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <Link to="/" className="text-primary">
        {t('read.vin.searchLink')}
      </Link>
      <Link to={`/${EXAMPLE_LINK_PLATE}`} className="text-primary">
        {t('read.vin.exampleLink')}
      </Link>
      {withAr && (
        <Link to="/?section=ar" className="text-primary">
          {t('read.plates.arLink')}
        </Link>
      )}
    </p>
  )
}

/** How to look a plate up in this app: typing, photo and the AR camera scan. */
export function SearchSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="search" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.searchTitle')}</h2>
      <p className="mb-3 text-muted">{pick(SEARCH_INTRO, i18n.language)}</p>

      <ol className="mb-3 list-decimal space-y-2 pl-5">
        {SEARCH_STEPS.map(step => (
          <li key={step.title.en}>
            <span className="font-medium">{pick(step.title, i18n.language)}.</span> {pick(step.text, i18n.language)}
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted">{pick(SEARCH_NOTE, i18n.language)}</p>

      <PlateSearchLinks withAr />
    </Card>
  )
}
