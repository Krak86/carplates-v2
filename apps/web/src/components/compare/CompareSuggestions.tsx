import type { ReactNode } from 'react'
import { registryLabel } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { buildSuggestions } from './suggestions'
import type { Suggestion } from './suggestions'
import type { CompareLoaded, CompareRef } from './types'

type Props = {
  /** Car A: the suggestions are made from it. */
  from: CompareLoaded
  onPick: (ref: CompareRef) => void
}

const CHIP =
  'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'

/** Ready-made second cars for an empty slot B. */
export default function CompareSuggestions({ from, onPick }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const items = buildSuggestions(from)
  if (items.length === 0) return null

  const label = (s: Suggestion): string => {
    if (s.kind === 'otherFuel')
      return t('compare.suggest.otherFuel', { fuel: registryLabel('fuel', s.fuel, i18n.language) })
    if (s.kind === 'previousGeneration') return t('compare.suggest.previous', { generation: s.generation })
    return s.name
  }

  return (
    <div className="mt-3">
      <p className="mb-1 text-sm text-[var(--color-muted)]">{t('compare.suggest.title')}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map(s => (
          <li key={`${s.kind}-${s.ref.kind === 'model' ? `${s.ref.model}-${s.ref.year}-${s.ref.fuel}` : ''}`}>
            <button type="button" className={CHIP} onClick={() => onPick(s.ref)}>
              {label(s)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
