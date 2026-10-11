import type { ReactNode } from 'react'
import type { WikiEngineView } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import WikiSpecRow from '@/components/WikiSpecRow'
import { engineRows, formatEngine } from '@/components/WikiSpecs.helpers'

type Props = {
  engine: WikiEngineView
}

/** One engine of the generation: a heading and key / value rows (power, displacement, fuel, codes …), each with a ❓. */
export default function WikiEngineCard({ engine }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="py-2">
      <p className="text-base font-semibold">{formatEngine(engine, t)}</p>
      <div className="mt-1 divide-y divide-[var(--color-border)]">
        {engineRows(engine, t).map(r => (
          <WikiSpecRow
            key={r.key}
            label={t(`wikispec.row.${r.key}`)}
            value={r.value}
            about={t(`wikispec.about.${r.key}`)}
          />
        ))}
      </div>
    </div>
  )
}
