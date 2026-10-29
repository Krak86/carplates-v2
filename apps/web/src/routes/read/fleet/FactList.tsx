import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LAW_LINKS } from '@/routes/read/fleet/content'
import type { FactItem } from '@/routes/read/fleet/content'

type Props = {
  /** i18n namespace under `read.fleet.`, e.g. `colorFacts`. */
  prefix: string
  items: readonly FactItem[]
}

/** Collapsible facts of a fleet section, each with optional links to the laws it cites. */
export default function FactList({ prefix, items }: Props): ReactNode {
  const { t } = useTranslation()
  const base = `read.fleet.${prefix}`

  return (
    <div className="mt-4 grid gap-2">
      <h3 className="text-lg font-semibold">{t(`${base}.title`)}</h3>

      {items.map(item => (
        <details key={item.key} className="rounded-lg border border-(--color-border) p-3">
          <summary className="cursor-pointer font-medium">{t(`${base}.${item.key}.title`)}</summary>

          <p className="mt-2 text-muted">{t(`${base}.${item.key}.text`)}</p>

          {!!item.laws && (
            <ul className="mt-2 grid gap-1 text-sm">
              {item.laws.map(law => (
                <li key={law}>
                  <a href={LAW_LINKS[law]} target="_blank" rel="noopener noreferrer" className="text-primary">
                    {t(`read.fleet.law.${law}`)} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </details>
      ))}

      <p className="text-xs text-muted">{t(`${base}.source`)}</p>
    </div>
  )
}
