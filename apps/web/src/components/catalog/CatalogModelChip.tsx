import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useCatalogPath } from '@/hooks/useCatalogPath'

type Props = {
  brand: string | null | undefined
  model: string | null | undefined
}

/** "BMW X5 in Ukraine" chip linking to the catalog page; renders nothing when the model has no page. */
export default function CatalogModelChip({ brand, model }: Props): ReactNode {
  const { t } = useTranslation()
  const path = useCatalogPath(brand, model)
  if (!path) return null

  return (
    <Link
      to={path}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      <span aria-hidden>🚗</span>
      {t('catalog.title', { name: [brand, model].filter(Boolean).join(' ') })}
    </Link>
  )
}
