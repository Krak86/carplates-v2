import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RIA_CHECK_URL } from '@carplates/shared'

type Props = {
  kind: 'plate' | 'vin'
}

/**
 * Under "not found": a plain outbound link to AUTO.RIA's check (it knows some pre-2013 plates our open data lacks).
 * Link only, no RIA data is fetched or shown: their terms forbid reusing it (docs/legal-and-monetization.md).
 */
export default function RiaCheckLink({ kind }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <p className="mt-2 text-sm text-[var(--color-muted)]">
      {kind === 'plate' ? t('result.ria.hintPlate') : t('result.ria.hintVin')}{' '}
      <a href={RIA_CHECK_URL} target="_blank" rel="noopener noreferrer" className="underline">
        {t('result.ria.link')}
      </a>
    </p>
  )
}
