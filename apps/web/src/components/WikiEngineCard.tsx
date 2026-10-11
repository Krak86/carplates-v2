import type { ReactNode } from 'react'
import type { WikiEngineView } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import WikiSpecRow from '@/components/WikiSpecRow'
import { engineRows, formatEngine } from '@/components/WikiSpecs.helpers'
import { cn } from '@/lib/cn'

type Props = {
  engine: WikiEngineView
  /** The registry figures of this car fit this engine: the card is highlighted. */
  matches?: boolean
  /** "+0.4 L · +33 kW": how an engine that is not this car's differs from it, shown in brackets. */
  vsCar?: string | null
  /** Wikipedia edition the engine list was read from: the market note and the raw text are in that language. */
  sourceLang?: string
}

/** Rows whose value is the article's own wording (not a number, a code or a translated key). */
const SOURCE_TEXT_ROWS: readonly string[] = ['note', 'raw']

/** One engine of the generation: a heading and key / value rows (power, displacement, fuel, codes …), each with a ❓. */
export default function WikiEngineCard({ engine, matches, vsCar, sourceLang }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'py-2',
        matches && '-mx-4 my-1 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/8 px-4'
      )}
    >
      <p className="text-base font-semibold">
        {formatEngine(engine, t)}{' '}
        {matches && (
          <span className="ml-1 inline-block rounded-full bg-[var(--color-primary)] px-2 py-0.5 align-middle text-xs font-medium text-[var(--color-primary-fg)]">
            ✓ {t('wikispec.matches')}
          </span>
        )}
        {!matches && vsCar && (
          <span className="text-sm font-normal text-[var(--color-muted)]">
            ({t('wikispec.vsCar', { diff: vsCar })})
          </span>
        )}
      </p>
      <div className="mt-1 divide-y divide-[var(--color-border)]">
        {engineRows(engine, t).map(r => (
          <WikiSpecRow
            key={r.key}
            label={t(`wikispec.row.${r.key}`)}
            value={r.value}
            about={t(`wikispec.about.${r.key}`)}
            sourceLang={SOURCE_TEXT_ROWS.includes(r.key) ? sourceLang : undefined}
          />
        ))}
      </div>
    </div>
  )
}
