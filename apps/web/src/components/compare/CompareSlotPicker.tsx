import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { resolveFuelCategories } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { variantOptions, variantYears } from '@/components/catalog/ModelVariants.helpers'
import { catalogMakeQuery, catalogMakesQuery, catalogModelQuery } from '@/lib/queries'
import { typicalYear } from '@/routes/catalog/helpers'

import { parseCompareRef } from './ref'
import type { CompareRef, CompareSlot } from './types'

type Props = {
  slot: CompareSlot
  onPick: (ref: CompareRef) => void
}

const FIELD = 'rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-base'
const BUTTON =
  'rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-base text-[var(--color-primary-fg)] disabled:opacity-50'

/** The model picker: make, model, year, fuel - all from the catalog, so the ref carries its slugs. */
function ModelPicker({ slot, onPick }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [fuel, setFuel] = useState('')
  const makes = useQuery(catalogMakesQuery()).data?.makes ?? []
  const models = useQuery({ ...catalogMakeQuery(make), enabled: !!make }).data?.models ?? []
  const page = useQuery({ ...catalogModelQuery(make, model), enabled: !!make && !!model }).data
  const years = page ? variantYears(page.stats.years, page.n) : []
  const fuels = page ? variantOptions('fuel', page.stats.fuel, page.n, i18n.language) : []
  const chosenYear = year ?? (page ? typicalYear(page.stats.years) : null)

  return (
    <fieldset className="mt-3 flex flex-wrap items-end gap-2 border-0 p-0">
      <legend className="mb-1 text-sm text-[var(--color-muted)]">{t('compare.picker.model')}</legend>
      <select
        aria-label={t('compare.picker.make')}
        className={FIELD}
        value={make}
        onChange={e => {
          setMake(e.target.value)
          setModel('')
          setYear(null)
          setFuel('')
        }}
      >
        <option value="">{t('compare.picker.make')}</option>
        {makes.map(m => (
          <option key={m.make} value={m.make}>
            {m.makeName}
          </option>
        ))}
      </select>
      <select
        aria-label={t('compare.picker.modelName')}
        className={FIELD}
        value={model}
        disabled={!make}
        onChange={e => {
          setModel(e.target.value)
          setYear(null)
          setFuel('')
        }}
      >
        <option value="">{t('compare.picker.modelName')}</option>
        {models.map(m => (
          <option key={m.model} value={m.model}>
            {m.modelName}
          </option>
        ))}
      </select>
      <select
        aria-label={t('compare.picker.year')}
        className={FIELD}
        value={chosenYear ?? ''}
        disabled={!page}
        onChange={e => setYear(Number(e.target.value))}
      >
        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        aria-label={t('compare.picker.fuel')}
        className={FIELD}
        value={fuel}
        disabled={!page}
        onChange={e => setFuel(e.target.value)}
      >
        <option value="">{t('compare.picker.anyFuel')}</option>
        {fuels.map(f => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={BUTTON}
        disabled={!page || !chosenYear}
        onClick={() => {
          if (!page || !chosenYear) return
          onPick({ kind: 'model', make, model, year: chosenYear, fuel: resolveFuelCategories(fuel)[0] ?? null })
        }}
        data-slot={slot}
      >
        {t('compare.picker.add')}
      </button>
    </fieldset>
  )
}

/** An empty slot: type a plate or VIN, or pick a model. */
export default function CompareSlotPicker({ slot, onPick }: Props): ReactNode {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    const ref = parseCompareRef(text)
    setInvalid(!ref)
    if (ref) onPick(ref)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('compare.picker.placeholder')}
          aria-label={t('compare.picker.placeholder')}
          aria-invalid={invalid}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className={`${FIELD} min-w-0 flex-1`}
        />
        <button type="submit" className={BUTTON}>
          {t('compare.picker.add')}
        </button>
      </form>
      {invalid && (
        <p role="alert" className="mt-1 text-sm text-[var(--color-muted)]">
          {t('compare.picker.invalid')}
        </p>
      )}
      <ModelPicker slot={slot} onPick={onPick} />
    </div>
  )
}
