import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { isSovietPlate, isUaPlate, normalizePlate } from '@carplates/shared'

import OtherSourcesFound from '@/components/OtherSourcesFound'
import RiaCheckLink from '@/components/RiaCheckLink'
import { PLATES_PATH } from '@/routes/read/links'

type Props = {
  value: string
}

/** What we can still say about a plate with no registry match: its normalized form, region, and why it may be missing. */
export default function NotFoundInfo({ value }: Props): ReactNode {
  const { t } = useTranslation()
  const plate = normalizePlate(value)
  const isPlate = isUaPlate(value)
  const isSoviet = !isPlate && isSovietPlate(value)

  return (
    <div className="w-full max-w-content rounded-md bg-[var(--color-surface)]/20 px-3 py-2 text-left">
      <p className="text-center text-[var(--color-muted)]">{t('result.noResults', { value })}</p>

      {/* Old-format plates are the likeliest to be in the wanted lists only, so Soviet shapes are looked up too.
          Its plate line and data list are drawn like the registry card. */}
      {(isPlate || isSoviet) && <OtherSourcesFound plate={plate} showPlate={isPlate} />}

      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {isPlate ? t('result.notFound.hintPlate') : t('result.notFound.hintFormat')}
      </p>

      {isSoviet && (
        <p className="mt-2 text-sm">
          {t('result.notFound.hintSoviet')}{' '}
          <Link to={`${PLATES_PATH}#legacy`} className="text-primary">
            {t('nav.readPlates')} →
          </Link>
        </p>
      )}

      {isPlate && <RiaCheckLink kind="plate" value={plate} />}
    </div>
  )
}
