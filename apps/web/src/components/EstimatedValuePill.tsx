import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CopyButton from '@/components/CopyButton'
import { formatMoneyCopy, formatMoneyRange } from '@/components/EstimatedValue.helpers'
import InfoPopover from '@/components/InfoPopover'
import type { EstimatedValueData } from '@/components/use-estimated-value'

// Popover bodies load on first show.
const EstimatedValueTip = lazy(() => import('@/components/EstimatedValueTip'))
const EstimatedValueDetails = lazy(() => import('@/components/EstimatedValueDetails'))

type Props = {
  value: EstimatedValueData
  /** Extra control between the copy button and the "?" (the card-header chevron). */
  trailing?: ReactNode
}

/**
 * Green "~ € X–Y 💶" pill with its hover tip, a copy button (the range in the shown currency) and a "?" explainer.
 * Rendered twice: collapsed in the card header, and at the top of the Estimated value section.
 */
export default function EstimatedValuePill({ value, trailing }: Props): ReactNode {
  const { t } = useTranslation()
  const { match, estimate, price, currency, fx, locale, rough } = value

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <InfoPopover
        label={t('value.chipHint')}
        title={t('value.title')}
        triggerClassName="inline-flex cursor-help items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-0.5 text-base font-semibold text-emerald-800 dark:text-emerald-300"
        trigger={
          <>
            {formatMoneyRange(price.low.totalEur, price.high.totalEur, currency, fx, locale)}
            <span aria-hidden>💶</span>
            {rough && <span aria-hidden>⚠️</span>}
          </>
        }
      >
        <Suspense fallback={null}>
          <EstimatedValueTip
            match={match}
            estimate={estimate}
            price={price}
            currency={currency}
            fx={fx}
            locale={locale}
          />
        </Suspense>
      </InfoPopover>

      <CopyButton
        text={formatMoneyCopy(price.low.totalEur, price.high.totalEur, currency, fx, locale)}
        label={t('value.title')}
        className="size-6 justify-center rounded-full bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/30 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-300"
      />

      {trailing}

      <InfoPopover label={t('vin.info.about', { field: t('value.title') })} title={t('value.title')}>
        <Suspense fallback={null}>
          <EstimatedValueDetails match={match} estimate={estimate} locale={locale} />
        </Suspense>
      </InfoPopover>
    </div>
  )
}
