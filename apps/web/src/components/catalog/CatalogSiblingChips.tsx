import type { ReactNode } from 'react'
import { catalogMakePath, catalogPath } from '@carplates/shared'
import type { CatalogModel } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

type Props = {
  model: CatalogModel
}

const CHIP =
  'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'

/** The make's page first, then its biggest other models: the way on from a model page. */
export default function CatalogSiblingChips({ model }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-wrap gap-2">
      <li>
        <Link
          to={catalogMakePath(model.make)}
          className={`${CHIP} border-[var(--color-primary)] font-medium text-[var(--color-primary)]`}
        >
          {t('catalog.allOfMake', { make: model.makeName })}
        </Link>
      </li>
      {model.siblings.map(s => (
        <li key={s.model}>
          <Link to={catalogPath(model.make, s.model)} className={`${CHIP} border-[var(--color-border)]`}>
            {`${model.makeName} ${s.modelName}`}
          </Link>
        </li>
      ))}
    </ul>
  )
}
