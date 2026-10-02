import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { FieldMap } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
}

/** The decoder's verdict: a quiet "clean" chip, or an amber banner when NHTSA flagged a problem (bad check digit, partial decode…). */
export default function VinStatusBanner({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const code = fields.get('Error Code')
  if (code === undefined) return null

  if (code.trim() === '0') {
    return (
      <p className="mb-3 inline-block rounded-full bg-emerald-500/15 px-3 py-0.5 text-sm text-emerald-800 dark:text-emerald-300">
        ✓ {t('vin.status.clean')}
      </p>
    )
  }

  const detail = [fields.get('Error Text'), fields.get('Additional Error Text')].filter(Boolean).join(' · ')
  return (
    <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
      ⚠️ {detail || t('vin.status.problem')}
    </p>
  )
}
