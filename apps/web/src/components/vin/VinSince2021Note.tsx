import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** `noVin`: the plate itself has no VIN — shorter text without the worked example. */
  variant?: 'history' | 'noVin'
}

/** Explains that the open registry only publishes VINs since 2021, so older plates/owners are not linked by VIN. */
export default function VinSince2021Note({ variant = 'history' }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <aside className="mt-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-sm">
      <p className="font-medium text-sky-900 dark:text-sky-200">ℹ️ {t('vin.since2021.title')}</p>
      <p className="mt-0.5 text-[var(--color-muted)]">
        {t(variant === 'noVin' ? 'vin.since2021.noVin' : 'vin.since2021.body')}
      </p>
    </aside>
  )
}
