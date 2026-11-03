import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CURRENCIES, type Currency } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { customsPriceHref, parsePositive } from '@/routes/customs/helpers'

type Props = {
  /** `/customs` link prefilled with the car (the price and its currency are added to it). */
  customsPath: string
}

const FIELD_CLASS =
  'rounded-lg border border-border bg-[var(--color-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]'

/** A final lot price typed here opens the customs calculator with that price and its currency already set. */
export default function AuctionPriceCheck({ customsPath }: Props): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const parsed = parsePositive(price)

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (parsed != null) void navigate(customsPriceHref(customsPath, parsed, currency))
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        inputMode="decimal"
        value={price}
        onChange={e => setPrice(e.target.value)}
        placeholder={t('auctions.priceLabel')}
        aria-label={t('auctions.priceLabel')}
        className={`${FIELD_CLASS} w-36`}
      />
      <select
        value={currency}
        onChange={e => setCurrency(e.target.value as Currency)}
        aria-label={t('customs.form.valueCurrency')}
        className={FIELD_CLASS}
      >
        {CURRENCIES.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={parsed == null}
        className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {t('auctions.priceCalc')}
      </button>
    </form>
  )
}
