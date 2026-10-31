import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

type Props = {
  /** Raw registry spelling to prefill the advanced search with (a make or model page). */
  brand?: string | null
  model?: string | null
}

/** Cross link from a catalog view to the advanced search, with the reason the catalog can miss cars. */
export default function CatalogAdvancedSearchNote({ brand, model }: Props): ReactNode {
  const { t } = useTranslation()
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (brand && model) params.set('model', model)
  const query = params.toString()

  return (
    <aside className="text-base">
      <p className="text-muted">{t('catalog.advancedWhy')}</p>
      <p className="mt-1">
        <Link to={query ? `/advanced-search?${query}` : '/advanced-search'} className="text-primary underline">
          {t(model ? 'catalog.advancedLinkModel' : brand ? 'catalog.advancedLinkMake' : 'catalog.advancedLink')}
        </Link>
      </p>
    </aside>
  )
}
