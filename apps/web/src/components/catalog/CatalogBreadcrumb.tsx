import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export type Crumb = {
  label: string
  /** Absent on the last crumb: the page itself. */
  to?: string
}

type Props = {
  crumbs: Crumb[]
}

/** Home > Cars > BMW > X5. Plain links (the server block and `BreadcrumbList` JSON-LD carry the same trail). */
export default function CatalogBreadcrumb({ crumbs }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('catalog.crumbLabel')} className="px-1">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-[var(--color-muted)]">
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.to ?? crumb.label}>
            {i > 0 && (
              <li aria-hidden>
                <span>›</span>
              </li>
            )}
            <li className="min-w-0">
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-[var(--color-primary)] hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-[var(--color-fg)]">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
