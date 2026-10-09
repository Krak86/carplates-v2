import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { newCarsUrl } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import { displayBrand } from '@/lib/display-brand'

type Props = {
  brand: string | null
}

/**
 * "New <Brand> <year>" call-to-action: brand logo + label linking to the importer's model-range page
 * (or the brand's site when no list page is known). Link only — no importer content is fetched or shown.
 */
export default function NewCarsLink({ brand }: Props): ReactNode {
  const { t } = useTranslation()
  const target = newCarsUrl(brand)
  if (!brand || !target) return null

  const title = t('result.newCarsList')

  return (
    <a
      href={target.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={title}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/20 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
    >
      <BrandLogo brand={brand} size="sm" />
      {t('result.newCars', { brand: displayBrand(brand), year: new Date().getFullYear() })}
      <span aria-hidden>↗</span>
      <span className="sr-only">
        {title} — {t('field.opensNewTab')}
      </span>
    </a>
  )
}
