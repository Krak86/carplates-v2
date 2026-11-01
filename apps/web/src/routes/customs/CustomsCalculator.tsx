import { useState, type ReactNode } from 'react'
import {
  calcImportCosts,
  CUSTOMS_PRESETS,
  IMPORT_FUELS,
  pickCustomsRules,
  type CustomsQuery,
  type ImportFuel
} from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { fxQuery } from '@/lib/queries'
import CustomsResult from '@/routes/customs/CustomsResult'
import { formToInput, initialForm, presetHref, type FormState } from '@/routes/customs/helpers'

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]'
const LABEL_CLASS = 'mb-1 block text-xs font-medium text-[var(--color-muted)]'

type TextField = 'value' | 'year' | 'kwh' | 'cc' | 'duty'

type Props = {
  query: CustomsQuery
  hasParams: boolean
}

export default function CustomsCalculator({ query, hasParams }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const fx = useQuery(fxQuery()).data ?? null
  const [form, setForm] = useState<FormState>(() => initialForm(query, hasParams))

  const today = new Date()
  const rules = pickCustomsRules(today.toISOString())
  const input = formToInput(form, today.getFullYear(), fx?.eurUah ?? 1)
  const costs = input && rules ? calcImportCosts(input, rules) : null
  const isEv = form.fuel === 'ev'

  const textField = (
    key: TextField,
    id: string,
    label: string,
    inputMode: 'decimal' | 'numeric',
    placeholder?: string
  ): ReactNode => (
    <div>
      <label className={LABEL_CLASS} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        inputMode={inputMode}
        value={form[key]}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    </div>
  )

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t('customs.form.title')}</h2>
        <div>
          <label className={LABEL_CLASS} htmlFor="customs-fuel">
            {t('customs.form.fuel')}
          </label>
          <select
            id="customs-fuel"
            value={form.fuel}
            onChange={e => setForm(prev => ({ ...prev, fuel: e.target.value as ImportFuel }))}
            className={INPUT_CLASS}
          >
            {IMPORT_FUELS.map(fuel => (
              <option key={fuel} value={fuel}>
                {t(`customs.fuel.${fuel}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          {textField('value', 'customs-value', t('customs.form.value'), 'decimal')}
          <p className="mt-1 text-xs text-muted">{t('customs.form.valueHint')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {textField('year', 'customs-year', t('customs.form.year'), 'numeric')}
          {isEv
            ? textField('kwh', 'customs-kwh', t('customs.form.kwh'), 'decimal')
            : textField('cc', 'customs-cc', t('customs.form.cc'), 'numeric')}
        </div>
        {textField('duty', 'customs-duty', t('customs.form.duty'), 'decimal', '10')}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.eur1}
            onChange={e => setForm(prev => ({ ...prev, eur1: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            {t('customs.form.eur1')}
            <span className="block text-xs text-muted">{t('customs.form.eur1Hint')}</span>
          </span>
        </label>

        <div className="space-y-1 border-t border-border pt-3">
          <h3 className="text-xs font-medium text-muted">{t('customs.presets.title')}</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {CUSTOMS_PRESETS.map(preset => (
              <li key={preset.id}>
                <Link to={presetHref(preset)} className="text-primary underline">
                  {t(`customs.presets.${preset.id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <CustomsResult costs={costs} input={input} rules={rules} fx={fx} locale={locale} />
    </div>
  )
}
