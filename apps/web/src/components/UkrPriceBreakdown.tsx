import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CURRENCIES,
  UKR_DUTY_RATE,
  UKR_VAT_RATE,
  type Currency,
  type FxResponse,
  type RdwMatchInfo
} from '@carplates/shared'

import {
  formatMoney,
  formatMoneyRange,
  riaSearchUrl,
  valueWarnings,
  type UkrPrice
} from '@/components/EstimatedValue.helpers'
import { cn } from '@/lib/cn'

type Props = {
  match: RdwMatchInfo
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  price: UkrPrice
  fuel: string | null | undefined
  makeYear: number
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  /** NBU rates, or null while loading / unavailable (then only euros can be shown). */
  fx: FxResponse | null
  locale: string
}

const PERCENT = (rate: number): number => Math.round(rate * 100)

/**
 * The expanded part of the value chip: the clean EU value, how Ukrainian customs lift it (duty, excise, VAT at the
 * middle of the range), the NBU currency switch, a link to AUTO.RIA's own listings and every caveat that applies.
 */
export default function UkrPriceBreakdown({
  match,
  estimate,
  price,
  fuel,
  makeYear,
  currency,
  onCurrencyChange,
  fx,
  locale
}: Props): ReactNode {
  const { t } = useTranslation()
  const money = (eur: number): string => formatMoney(eur, currency, fx, locale)
  const warnings = valueWarnings(match, estimate, price, fuel)
  const mid = price.mid
  const sign = { EUR: '€', USD: '$', UAH: '₴' }[currency]

  return (
    <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{t('value.ua.eu')}</span>
        <span className="text-base font-semibold">
          {formatMoneyRange(estimate.lowEur, estimate.highEur, currency, fx, locale)}
        </span>
      </div>

      <dl className="space-y-0.5 text-[var(--color-muted)]">
        <p className="text-xs">{t('value.ua.mid')}</p>
        <Row label={t('value.ua.base')} value={`${sign} ${money(mid.baseEur)}`} />
        <Row
          label={t('value.ua.duty', { percent: PERCENT(UKR_DUTY_RATE) })}
          value={`+ ${sign} ${money(mid.dutyEur)}`}
        />
        <Row
          label={t('value.ua.excise', { k: mid.ageK })}
          value={mid.exciseKnown ? `+ ${sign} ${money(mid.exciseEur)}` : '?'}
        />
        <Row label={t('value.ua.vat', { percent: PERCENT(UKR_VAT_RATE) })} value={`+ ${sign} ${money(mid.vatEur)}`} />
        <Row strong label={t('value.ua.total')} value={`${sign} ${money(mid.totalEur)}`} />
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-muted)]">{t('value.ua.currency')}</span>
        <div
          role="group"
          aria-label={t('value.ua.currency')}
          className="inline-flex overflow-hidden rounded-full border border-[var(--color-border)]"
        >
          {CURRENCIES.map(c => (
            <button
              key={c}
              type="button"
              disabled={c !== 'EUR' && !fx}
              aria-pressed={c === currency}
              onClick={() => onCurrencyChange(c)}
              className={cn(
                'px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-40',
                c === currency ? 'bg-emerald-500/30 text-[var(--color-fg)]' : 'hover:bg-[var(--color-border)]/50'
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {fx && (
          <a
            href="https://bank.gov.ua/ua/markets/exchangerates"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-muted)] underline"
          >
            {t('value.ua.rate', {
              eur: fx.eurUah.toFixed(2),
              usd: fx.usdUah.toFixed(2),
              date: new Date(fx.date).toLocaleDateString(locale)
            })}{' '}
            ↗
          </a>
        )}
      </div>

      <ul className="space-y-0.5 text-xs text-[var(--color-muted)]">
        <li>⚠️ {t('value.warn.notPrice')}</li>
        {warnings.map(w => (
          <li key={w.key}>⚠️ {t(`value.warn.${w.key}`, w.values)}</li>
        ))}
      </ul>

      <a
        href={riaSearchUrl(match.makeName, match.modelName, makeYear)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-[var(--color-primary)] underline"
      >
        {t('value.ua.ria')} ↗
      </a>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }): ReactNode {
  return (
    <div
      className={cn(
        'flex justify-between gap-3',
        strong && 'border-t border-[var(--color-border)] pt-0.5 font-semibold text-[var(--color-fg)]'
      )}
    >
      <dt>{label}</dt>
      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}
