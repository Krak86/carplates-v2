import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { fallbackSources } from '@/components/vin/helpers'
import type { VinFallback } from '@/components/vin/helpers'

type Props = {
  fallback: VinFallback
}

/** Explains the "≈" tags: why NHTSA came up short and what each fallback source means (only the ones actually used). */
export default function VinFallbackNote({ fallback }: Props): ReactNode {
  const { t } = useTranslation()
  const sources = fallbackSources(fallback)
  if (sources.length === 0) return null

  return (
    <aside className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-sm">
      <p className="font-medium text-sky-900 dark:text-sky-200">ℹ️ {t('vin.derived.title')}</p>
      <p className="mt-0.5 text-[var(--color-muted)]">{t('vin.derived.why')}</p>

      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--color-muted)]">
        {sources.map(s => (
          <li key={s}>
            <b className="font-medium text-[var(--color-fg)]">≈ {t(`vin.derived.${s}.label`)}</b> —{' '}
            {t(`vin.derived.${s}.hint`)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
