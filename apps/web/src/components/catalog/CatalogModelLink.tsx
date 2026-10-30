import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useCatalogPath } from '@/hooks/useCatalogPath'

type Props = {
  brand: string | null | undefined
  model: string | null | undefined
  children: ReactNode
}

/** Wraps the make/model text of a result card in a link to its catalog page; plain text when the model has no page. */
export default function CatalogModelLink({ brand, model, children }: Props): ReactNode {
  const { t } = useTranslation()
  const path = useCatalogPath(brand, model)
  if (!path) return children

  return (
    <Link
      to={path}
      title={t('catalog.title', { name: [brand, model].filter(Boolean).join(' ') })}
      className="hover:text-[var(--color-primary)] hover:underline"
    >
      {children}
    </Link>
  )
}
