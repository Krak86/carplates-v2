import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse, RdwMatchInfo } from '@carplates/shared'

import EstimatedValueDetails from '@/components/EstimatedValueDetails'
import type { UkrPrice } from '@/components/EstimatedValue.helpers'
import ShareButton from '@/components/ShareButton'
import UkrPriceBreakdown from '@/components/UkrPriceBreakdown'
import ValuePriceByFuel from '@/components/ValuePriceByFuel'
import VinToggleSection from '@/components/vin/VinToggleSection'

type Props = {
  match: RdwMatchInfo
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  price: UkrPrice
  fuel: string | null | undefined
  makeYear: number
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  fx: FxResponse | null
  locale: string
}

/**
 * Everything behind the chip's chevron in one bordered block: header with the share link, the green customs
 * breakdown and the collapsed "Charts and explanation" folder. Lazy-loaded by the chip on first open, so the charts and
 * breakdown code stays out of the main bundle.
 */
export default function EstimatedValuePanel(props: Props): ReactNode {
  const { t } = useTranslation()
  const { match, estimate, locale } = props

  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden>💶</span>
          {t('value.title')}
        </span>
        <ShareButton section="value" label={t('share.button', { section: t('value.title') })} />
      </div>

      <UkrPriceBreakdown {...props} />

      {(match.priceByFuel?.length ?? 0) >= 2 && (
        <ValuePriceByFuel
          fuels={match.priceByFuel ?? []}
          retained={estimate.retained}
          currency={props.currency}
          fx={props.fx}
          locale={locale}
        />
      )}

      {/* Same folder pattern as the VIN section: everything the "?" and the chip tip say, charts included, in one place. */}
      <VinToggleSection
        icon="📊"
        defaultOpen={false}
        showLabel={t('vin.group.show')}
        hideLabel={t('vin.group.hide')}
        title={t('value.details.title')}
      >
        <EstimatedValueDetails
          match={match}
          estimate={estimate}
          locale={locale}
          currency={props.currency}
          fx={props.fx}
        />
      </VinToggleSection>
    </div>
  )
}
