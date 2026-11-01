import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import GenerationChip from '@/components/GenerationChip'
import VdbChips from '@/components/VdbChips'
import { fallbackSources, typicalLookup } from '@/components/vin/helpers'
import type { FieldMap, VinFallback } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
  fallback: VinFallback
}

/**
 * One explanation for everything on the VIN page that is not decoded from this VIN: why NHTSA came up short and what each
 * "≈" source means (only the ones used), then - when model-level data follows below - that it is typical data for the model.
 */
export default function VinFallbackNote({ fields, fallback }: Props): ReactNode {
  const { t } = useTranslation()
  const sources = fallbackSources(fallback)
  const lookup = typicalLookup(fields, fallback)
  if (sources.length === 0 && !lookup) return null

  return (
    <aside className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-sm">
      {sources.length > 0 && (
        <>
          <p className="font-medium text-sky-900 dark:text-sky-200">ℹ️ {t('vin.derived.title')}</p>
          <p className="mt-0.5 text-[var(--color-muted)]">{t('vin.derived.why')}</p>

          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--color-muted)]">
            {sources.map(s => (
              <li key={s}>
                <b className="font-medium text-[var(--color-fg)]">≈ {t(`vin.derived.${s}.label`)}</b> -{' '}
                {t(`vin.derived.${s}.hint`)}
              </li>
            ))}
          </ul>
        </>
      )}

      {lookup && (
        <div className={sources.length > 0 ? 'mt-2 border-t border-dashed border-sky-500/30 pt-1.5' : undefined}>
          <p className="font-medium">
            <span className="mr-1.5 rounded-full border border-dashed border-[var(--color-border)] px-1.5 py-px text-xs font-normal text-[var(--color-muted)]">
              ≈ {t('vin.typical.label')}
            </span>
            {t('vin.typical.title', { name: `${lookup.brand} ${lookup.model}` })}
          </p>
          <p className="mt-0.5 text-[var(--color-muted)]">{t('vin.typical.why')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
            <VdbChips brand={lookup.brand} model={lookup.model} kind={lookup.kind} />
            <GenerationChip brand={lookup.brand} model={lookup.model} year={lookup.year} />
          </div>
        </div>
      )}
    </aside>
  )
}
