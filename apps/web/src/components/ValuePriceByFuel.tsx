import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RDW_MIN_DISPLAY_N, type Currency, type FxResponse, type RdwMatchInfo } from '@carplates/shared'

import { formatMoney } from '@/components/EstimatedValue.helpers'
import { approxCount } from '@/components/RdwSpecs.helpers'
import { cn } from '@/lib/cn'

type Props = {
  fuels: NonNullable<RdwMatchInfo['priceByFuel']>
  /** Share (0-1) of the new price the curve leaves at this car's age. */
  retained: number
  currency: Currency
  fx: FxResponse | null
  locale: string
}

/**
 * The same model-year priced per fuel version: a model sold as petrol, diesel and electric has very different list
 * prices, and the all-versions median hides that. Classes seen on fewer than `RDW_MIN_DISPLAY_N` Dutch cars are dimmed.
 */
export default function ValuePriceByFuel({ fuels, retained, currency, fx, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const money = (eur: number): string => formatMoney(eur, currency, fx, locale)
  const sign = { EUR: '€', USD: '$', UAH: '₴' }[currency]

  return (
    <section className="space-y-1 rounded-md border border-[var(--color-border)] p-2.5 text-sm">
      <h4 className="text-xs font-semibold">{t('value.fuel.title')}</h4>

      <table className="w-full text-xs">
        <thead className="text-[var(--color-muted)]">
          <tr>
            <th className="py-0.5 text-left font-normal">{t('value.fuel.version')}</th>
            <th className="py-0.5 text-right font-normal">{t('value.fuel.newPrice')}</th>
            <th className="py-0.5 text-right font-normal">{t('value.fuel.value')}</th>
          </tr>
        </thead>
        <tbody>
          {fuels.map(f => {
            const few = f.n < RDW_MIN_DISPLAY_N
            return (
              <tr key={f.fuel} className={cn('border-t border-[var(--color-border)]', few && 'opacity-60')}>
                <td className="py-0.5">
                  {t(`rdw.fuel.${f.fuel}`)}
                  <span className="ml-1 text-[var(--color-muted)]">
                    ({few ? t('value.fuel.few', { n: f.n }) : approxCount(f.n, locale)})
                  </span>
                </td>
                <td className="py-0.5 text-right whitespace-nowrap tabular-nums">
                  {sign} {money(f.priceEur)}
                </td>
                <td className="py-0.5 text-right whitespace-nowrap tabular-nums">
                  ~ {sign} {money(f.priceEur * retained)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="text-xs text-[var(--color-muted)]">{t('value.fuel.note')}</p>
    </section>
  )
}
