import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse } from '@carplates/shared'

import { nbuRatesUrl } from '@/components/EstimatedValue.helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  currency: Currency
  onChange: (currency: Currency) => void
  /** NBU rates, or null while loading: the switch stays disabled and prices stay in hryvnias. */
  fx: FxResponse | null
}

const CURRENCIES = ['EUR', 'USD', 'UAH'] as const

/** UAH / USD / EUR switch for the lot prices (they are hryvnias in the feed), with the NBU rate line under it. */
export default function AuctionCurrency({ currency, onChange, fx }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
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
            disabled={!fx && c !== 'UAH'}
            aria-pressed={c === currency}
            onClick={() => onChange(c)}
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
          href={nbuRatesUrl(i18n.language, fx.date)}
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
  )
}
