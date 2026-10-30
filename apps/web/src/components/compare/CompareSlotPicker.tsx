import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { resolveFuelCategories } from '@carplates/shared'
import type { VehicleFuel } from '@carplates/shared'
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

/** What the picker starts from when it edits a car already in the slot. */
export type ModelPickerInitial = {
  make: string
  model: string
  year: number | null
  fuel: VehicleFuel | null
}

type ModelPickerProps = Props & {
  initial?: ModelPickerInitial
  /** Shown only when the picker edits a filled slot. */
  onCancel?: () => void
}

const FIELD = 'rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-base'
const BUTTON =
  'rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-base text-[var(--color-primary-fg)] disabled:opacity-50'

/** The model picker: make, model, year, fuel - all from the catalog, so the ref carries its slugs. */
export function ModelPicker({ slot, onPick, initial, onCancel }: ModelPickerProps): ReactNode {
  const { t, i18n } = useTranslation()
  const [make, setMake] = useState(initial?.make ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [year, setYear] = useState<number | null>(initial?.year ?? null)
  // null = untouched: the select shows the option of the car's own fuel until the reader picks another.
  const [pickedFuel, setPickedFuel] = useState<string | null>(null)
  const makes = useQuery(catalogMakesQuery()).data?.makes ?? []
  const models = useQuery({ ...catalogMakeQuery(make), enabled: !!make }).data?.models ?? []
  const page = useQuery({ ...catalogModelQuery(make, model), enabled: !!make && !!model }).data
  const years = page ? variantYears(page.stats.years, page.n) : []
  const fuels = page ? variantOptions('fuel', page.stats.fuel, page.n, i18n.language) : []
  const chosenYear = year ?? (page ? typicalYear(page.stats.years) : null)
  const initialFuel = initial?.fuel
  const fuel =
    pickedFuel ?? (initialFuel ? (fuels.find(o => resolveFuelCategories(o.value)[0] === initialFuel)?.value ?? '') : '')
  const setFuel = setPickedFuel
  // A year outside the model's list (a plate car older than the catalog's span) would show a blank select.
  const yearOptions = chosenYear && !years.includes(chosenYear) && page ? [chosenYear, ...years] : years

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
        {yearOptions.map(y => (
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
        {t(onCancel ? 'compare.picker.apply' : 'compare.picker.add')}
      </button>
      {onCancel && (
        <button
          type="button"
          className="px-2 py-1.5 text-base text-[var(--color-primary)] underline"
          onClick={onCancel}
        >
          {t('compare.picker.cancel')}
        </button>
      )}
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
