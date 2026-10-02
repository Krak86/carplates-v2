import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoMeta } from '@carplates/shared'

import { REGISTRY_START_YEAR, isBeforeRegistry, photoAgeYears } from '@/lib/photo-meta'

type Props = {
  meta?: PhotoMeta | null
  maxDimension: number
  showAccuracy: boolean
}

export default function PhotoWarnings({ meta, maxDimension, showAccuracy }: Props): ReactNode {
  const { t } = useTranslation()
  const years = meta ? photoAgeYears(meta) : 0

  return (
    <ul className="flex w-full max-w-2xl list-none flex-col gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
      {meta && isBeforeRegistry(meta) && (
        <li className="flex items-start gap-1.5">
          <span aria-hidden>🗄️</span>
          {t('photo.meta.preRegistry', { year: REGISTRY_START_YEAR })}
        </li>
      )}
      {years >= 1 && (
        <li className="flex items-start gap-1.5">
          <span aria-hidden>⏳</span>
          {t('photo.meta.old', { count: years })}
        </li>
      )}
      <li className="flex items-start gap-1.5">
        <span aria-hidden>💡</span>
        {t('recognize.photoTips', { max: maxDimension })}
      </li>
      {showAccuracy && (
        <li className="flex items-start gap-1.5">
          <span aria-hidden>⚠️</span>
          {t('recognize.accuracyWarning')}
        </li>
      )}
    </ul>
  )
}
