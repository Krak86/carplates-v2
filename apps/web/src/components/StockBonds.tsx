import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { bondSearchUrl, tradingViewUrl } from '@carplates/shared'

type Props = {
  companyName: string
  /** The company's main Yahoo symbol, for its TradingView page. */
  symbol: string
}

/** Debt side of the company: what a bond is and where to see the maker's bonds (no free live bond charts, so link-out). */
export default function StockBonds({ companyName, symbol }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <h3 className="text-sm font-semibold">
        <span aria-hidden>🏦</span> {t('stock.bonds.title')}
      </h3>
      <p className="text-sm text-muted">{t('stock.bonds.about')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          href={bondSearchUrl(companyName)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {t('stock.bonds.frankfurt', { name: companyName })} ↗
          <span className="sr-only"> - {t('newCarsWidget.opensNewTab')}</span>
        </a>
        <a href={tradingViewUrl(symbol)} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {t('stock.bonds.tradingView', { name: companyName })} ↗
          <span className="sr-only"> - {t('newCarsWidget.opensNewTab')}</span>
        </a>
      </div>
    </div>
  )
}
