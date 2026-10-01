import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isUaPlate, normalizePlate, regionName } from '@carplates/shared'

type Props = {
  value: string
}

/** What we can still say about a plate with no registry match: its normalized form, region, and why it may be missing. */
export default function NotFoundInfo({ value }: Props): ReactNode {
  const { t } = useTranslation()
  const plate = normalizePlate(value)
  const isPlate = isUaPlate(value)
  const region = isPlate ? regionName(plate) : undefined

  return (
    <div className="w-full max-w-2xl rounded-md bg-[var(--color-surface)]/20 px-3 py-2 text-left">
      <p className="text-center text-[var(--color-muted)]">{t('result.noResults', { value })}</p>

      {isPlate && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-[var(--color-muted)]">{t('result.notFound.plate')}</dt>
          <dd className="font-mono font-semibold">{plate}</dd>

          <dt className="text-[var(--color-muted)]">{t('result.region')}</dt>
          <dd>{region ?? t('result.regionUnknown')}</dd>
        </dl>
      )}

      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {isPlate ? t('result.notFound.hintPlate') : t('result.notFound.hintFormat')}
      </p>
    </div>
  )
}
