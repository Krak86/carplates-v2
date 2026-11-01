import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { isSovietPlate, isUaPlate, normalizePlate, regionName } from '@carplates/shared'

import NoRegionBadge from '@/components/NoRegionBadge'
import OtherSourcesFound from '@/components/OtherSourcesFound'
import RiaCheckLink from '@/components/RiaCheckLink'
import { useRegionLabel } from '@/lib/region-label'
import { PLATES_PATH } from '@/routes/read/links'

type Props = {
  value: string
}

/** What we can still say about a plate with no registry match: its normalized form, region, and why it may be missing. */
export default function NotFoundInfo({ value }: Props): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const plate = normalizePlate(value)
  const isPlate = isUaPlate(value)
  const isSoviet = !isPlate && isSovietPlate(value)
  const leadFacts: [string, ReactNode][] = isPlate
    ? [
        [t('result.notFound.plate'), <span className="font-mono">{plate}</span>],
        [t('result.region'), regionLabel(regionName(plate)) ?? <NoRegionBadge plate={plate} />]
      ]
    : []

  return (
    <div className="w-full max-w-content rounded-md bg-[var(--color-surface)]/20 px-3 py-2 text-left">
      <p className="text-center text-[var(--color-muted)]">{t('result.noResults', { value })}</p>

      {/* Old-format plates are the likeliest to be in the wanted lists only, so Soviet shapes are looked up too.
          The plate and region are listed by it, below the photo, together with what the other sources hold. */}
      {(isPlate || isSoviet) && <OtherSourcesFound plate={plate} leadFacts={leadFacts} />}

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
