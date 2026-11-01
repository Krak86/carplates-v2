import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { instrumentLinks, yahooFinanceUrl } from '@carplates/shared'
import type { StockInstrument, StockRange, StockResponse } from '@carplates/shared'

import { formatStockMoney, seriesRange } from '@/components/stock-helpers'
import StockQuote from '@/components/StockQuote'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { stockQuoteQuery } from '@/lib/queries'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  brand: string
  companyName: string
  instrument: StockInstrument
  range: StockRange
  onRangeChange: (range: StockRange) => void
  tall: boolean
}

type Fact = { key: string; label: string; value: string }

/** One instrument of the listed company: what it is, the chart, the facts Yahoo reports and links to follow it elsewhere. */
export default function StockInstrumentPanel({
  brand,
  companyName,
  instrument,
  range,
  onRangeChange,
  tall
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const quote = useQuery({ ...stockQuoteQuery(brand, instrument.symbol, range), placeholderData: prev => prev })
  const data = quote.data
  const links = instrumentLinks(instrument.symbol)

  if (quote.isPending) return <SectionSkeleton />
  // An upstream hiccup returns an empty series: say so instead of an endless skeleton.
  if (!data || data.points.length < 2) return <p className="text-base text-muted">{t('section.empty')}</p>

  const asResponse: StockResponse = {
    company: {
      id: instrument.symbol,
      name: companyName,
      symbol: instrument.symbol,
      url: yahooFinanceUrl(instrument.symbol)
    },
    currency: data.currency,
    price: data.price,
    baseline: data.baseline,
    points: data.points
  }
  const money = (n: number): string => formatStockMoney(n, data.currency, i18n.language)
  const span = seriesRange(data.points)
  const facts: Fact[] = [
    data.exchange ? { key: 'exchange', label: t('stock.fact.exchange'), value: data.exchange } : null,
    data.currency ? { key: 'currency', label: t('stock.fact.currency'), value: data.currency } : null,
    span ? { key: 'low', label: t('stock.fact.low'), value: money(span.low) } : null,
    span ? { key: 'high', label: t('stock.fact.high'), value: money(span.high) } : null,
    data.yearLow ? { key: 'yearLow', label: t('stock.fact.yearLow'), value: money(data.yearLow) } : null,
    data.yearHigh ? { key: 'yearHigh', label: t('stock.fact.yearHigh'), value: money(data.yearHigh) } : null,
    data.volume
      ? {
          key: 'volume',
          label: t('stock.fact.volume'),
          value: new Intl.NumberFormat(toIntlLocale(i18n.language)).format(data.volume)
        }
      : null
  ].filter((f): f is Fact => !!f)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">
          {data.name ?? companyName} <span className="font-normal text-muted">- {instrument.symbol}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          <strong className="font-semibold text-fg">{t(`stock.kind.${instrument.kind}`)}.</strong>{' '}
          {t(`stock.kind.about.${instrument.kind}`)}
        </p>
      </div>

      <StockQuote data={asResponse} range={range} onRangeChange={onRangeChange} tall={tall} />

      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {facts.map(f => (
            <div key={f.key}>
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="font-medium tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {[
          { key: 'yahoo', label: t('stock.link.yahoo'), url: links.yahoo },
          { key: 'tradingView', label: t('stock.link.tradingView'), url: links.tradingView }
        ].map(l => (
          <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            {l.label} ↗<span className="sr-only"> - {t('newCarsWidget.opensNewTab')}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
