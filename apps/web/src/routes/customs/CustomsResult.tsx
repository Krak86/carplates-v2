import type { ReactNode } from 'react'
import type { CustomsRules, FxResponse, ImportCosts, ImportInput } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { formatEur, formatUah, percent } from '@/routes/customs/helpers'

type Props = {
  costs: ImportCosts | null
  input: ImportInput | null
  rules: CustomsRules | null
  fx: FxResponse | null
  locale: string
}

const NOTE_CLASS = 'rounded-lg bg-[var(--color-bg)] p-2 text-sm'

export default function CustomsResult({ costs, input, rules, fx, locale }: Props): ReactNode {
  const { t } = useTranslation()

  if (!rules) {
    return (
      <Card>
        <p className="text-muted">{t('customs.noRules')}</p>
      </Card>
    )
  }
  if (!costs || !input) {
    return (
      <Card>
        <p className="text-muted">{t('customs.empty')}</p>
      </Card>
    )
  }

  const eur = (n: number): string => formatEur(n, locale)
  const isEv = input.fuel === 'ev'
  const rows: { key: string; label: string; value: string }[] = [
    { key: 'value', label: t('customs.result.value'), value: eur(costs.valueEur) },
    { key: 'duty', label: t('customs.result.duty', { rate: percent(costs.dutyRate) }), value: eur(costs.dutyEur) },
    { key: 'excise', label: t('customs.result.excise'), value: eur(costs.exciseEur) },
    { key: 'vat', label: t('customs.result.vat', { rate: percent(rules.vatRate) }), value: eur(costs.vatEur) }
  ]

  const dutyLine =
    costs.dutyRate > 0
      ? t('customs.counted.duty', { rate: percent(costs.dutyRate), value: eur(costs.valueEur) })
      : isEv
        ? t('customs.counted.dutyEv')
        : t('customs.counted.dutyEur1')
  const exciseLine = isEv
    ? t('customs.counted.exciseEv', {
        rate: rules.excise.evEurPerKwh,
        kwh: input.kwh ?? '?',
        amount: eur(costs.exciseEur)
      })
    : t('customs.counted.excise', { cc: input.cc ?? '?', age: costs.ageK, amount: eur(costs.exciseEur) })
  const pensionLine = isEv
    ? t('customs.counted.pensionEv')
    : fx
      ? t('customs.counted.pension', {
          rate: percent(costs.pensionRate),
          uah: formatUah(costs.valueEur * fx.eurUah, locale),
          fx: fx.eurUah,
          date: fx.date
        })
      : t('customs.result.noRate')

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t('customs.result.title')}</h2>
        <dl className="space-y-1.5 text-sm">
          {rows.map(row => (
            <div key={row.key} className="flex justify-between gap-3">
              <dt>{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold">
            <dt>{t('customs.result.totalEur')}</dt>
            <dd className="tabular-nums">{eur(costs.totalEur)}</dd>
          </div>
          {fx && (
            <>
              <div className="flex justify-between gap-3">
                <dt>{t('customs.result.pension', { rate: percent(costs.pensionRate) })}</dt>
                <dd className="tabular-nums">{formatUah(costs.pensionUah, locale)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5 text-base font-bold">
                <dt>{t('customs.result.totalUah')}</dt>
                <dd className="tabular-nums">{formatUah(costs.totalUah, locale)}</dd>
              </div>
            </>
          )}
        </dl>
        {!fx && <p className="text-xs text-muted">{t('customs.result.noRate')}</p>}
        {costs.missing.map(field => (
          <p key={field} className={NOTE_CLASS}>
            {t(`customs.missing.${field}`)}
          </p>
        ))}
        {costs.estimate && <p className={NOTE_CLASS}>{t('customs.hybridNote')}</p>}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">{t('customs.counted.title')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{dutyLine}</li>
          <li>{exciseLine}</li>
          <li>{t('customs.counted.vat', { rate: percent(rules.vatRate), amount: eur(costs.vatEur) })}</li>
          <li>{pensionLine}</li>
        </ul>
        <p className="text-xs text-muted">{t('customs.counted.notIncluded')}</p>
      </Card>
    </div>
  )
}
