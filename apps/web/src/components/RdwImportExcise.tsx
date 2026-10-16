import { useState } from 'react'
import type { ReactNode } from 'react'
import { resolveFuelCategories } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { EXCISE_MAX_AGE, exciseAge, exciseEngine, exciseEur } from '@/components/RdwInsights.helpers'

type Props = {
  fuel?: string | null
  /** Engine size, cm³ (registry, else RDW median). */
  cc: number | null
  /** Model year the age is counted from. */
  year: number | null
  locale: string
}

/**
 * "What would importing it cost?": the Ukrainian excise on a used petrol or diesel car (Tax Code 215.3.5-1: base rate x
 * litres x age) with an age slider, because the way the age is counted is the part people argue about. Excise only — the
 * customs duty and 20 % VAT come on top and depend on origin, so the box says so. Electric, hybrid and gas-only cars have
 * other rules and show nothing.
 */
export default function RdwImportExcise({ fuel, cc, year, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const engine = exciseEngine(resolveFuelCategories(fuel))
  const startAge = year ? exciseAge(year, new Date().getFullYear()) : 1
  const [age, setAge] = useState(startAge)

  if (!engine || !cc || !year) return null

  return (
    <details open className="my-2 text-sm">
      <summary className="cursor-pointer text-[var(--color-primary)]">💶 {t('rdw.excise.title')}</summary>

      <label className="mt-2 flex items-center gap-2">
        <span className="w-28 shrink-0">{t('rdw.excise.age', { n: age })}</span>
        <input
          type="range"
          min={1}
          max={EXCISE_MAX_AGE}
          value={age}
          onChange={e => setAge(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
      </label>

      <p className="mt-1 text-base font-medium">≈ {exciseEur(engine, cc, age).toLocaleString(locale)} €</p>
      <p className="text-xs text-[var(--color-muted)]">
        {t('rdw.excise.formula', { cc: (cc / 1000).toFixed(1), engine: t(`rdw.excise.engine.${engine}`) })}{' '}
        {t('rdw.excise.note')}
      </p>
    </details>
  )
}
