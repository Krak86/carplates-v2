import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UKR_DUTY_RATE, UKR_VAT_RATE, type Currency } from '@carplates/shared'

import { effectiveCurrency, formatMoney, formatMoneyRange } from '@/components/EstimatedValue.helpers'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { US_PRICE_ANCHOR_ID, agedValuesDiffer, usEuGap, usValue } from '@/components/us-value.helpers'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { fxQuery, rdwQuery } from '@/lib/queries'

type Props = {
  /** Where it is mounted: inside the Estimated value section (only with an EU price) or alone (only without one). Omit for both. */
  scope?: 'withEu' | 'noEu'
  /** NHTSA "Base Price ($)" of the decoded VIN: the US MSRP of the trim, USD. */
  baseUsd: number
  brand: string | null
  model: string | null
  year: number | null
  kind?: string | null
  fuel?: string | null
  capacity?: number | null
  /** Shared currency switch of the plate card; the VIN page has none, so the block keeps its own. */
  currency?: Currency
  onCurrencyChange?: (currency: Currency) => void
}

const SIGN: Readonly<Record<Currency, string>> = { EUR: '€', USD: '$', UAH: '₴' }
const CARD = 'rounded-md border border-sky-500/30 bg-sky-500/10'
const PERCENT = (rate: number): number => Math.round(rate * 100)

/**
 * The VIN's US base price (NHTSA MSRP) next to the EU value. It never changes the EU figures. With an EU estimate it is a
 * compact cross-check (US vs Dutch new price ex-tax, with a "spec may differ" warning on a big gap); without one - typical
 * for US-market cars - it carries its own estimate: the same depreciation curve and Ukrainian customs, a wider range.
 */
export default function UsBasePriceSection({
  scope,
  baseUsd,
  brand,
  model,
  year,
  kind,
  fuel,
  capacity,
  currency: sharedCurrency,
  onCurrencyChange: onSharedChange
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [ownCurrency, setOwnCurrency] = useState<Currency>('EUR')
  const wanted = sharedCurrency ?? ownCurrency
  const onCurrencyChange = onSharedChange ?? setOwnCurrency
  const rdw = useQuery({ ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind), enabled: !!(brand && model && year) })
  const fx = useQuery({ ...fxQuery() }).data ?? null
  // Wait for the RDW answer: until then it is unknown whether the EU value or this fallback is the headline.
  if (!fx || !year || (!!(brand && model) && rdw.isPending)) return null

  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const currency = effectiveCurrency(wanted, fx)
  const sign = SIGN[currency]
  const money = (eur: number): string => formatMoney(eur, currency, fx, locale)
  const match = rdw.data?.match ?? null
  const hasEu = !!match?.valueEstimate
  const value = usValue({ baseUsd, fx, makeYear: year, nowYear: new Date().getFullYear(), fuel, capacityCc: capacity })
  const baseEur = value?.baseEur ?? (baseUsd * fx.usdUah) / fx.eurUah
  const euMid = match?.valueEstimate?.midEur
  const agedDiffers = !!(hasEu && value && euMid != null && agedValuesDiffer(value.midEur, euMid))
  const gap = hasEu ? usEuGap(baseEur, match?.specs.priceExTaxEur?.median) : null
  const euExTax = match?.specs.priceExTaxEur?.median ?? null

  if (!hasEu && !value) return null
  if ((scope === 'withEu' && !hasEu) || (scope === 'noEu' && hasEu)) return null

  return (
    <div id={US_PRICE_ANCHOR_ID} className="scroll-mt-16">
      <Frame
        flat={scope === 'withEu'}
        title={
          <>
            {t(hasEu ? 'value.us.titleCheck' : 'value.us.title')}
            {!hasEu && value && (
              <span className="ml-2 text-base font-semibold text-sky-800 dark:text-sky-300">
                {formatMoneyRange(value.lowEur, value.highEur, currency, fx, locale)}
              </span>
            )}
          </>
        }
        info={
          <InfoPopover label={t('vin.info.about', { field: t('value.us.title') })} title={t('value.us.title')}>
            <InfoText text={t('value.us.info')} highlight={['NHTSA', 'MSRP']} />
          </InfoPopover>
        }
      >
        <div className={cn('space-y-2 text-sm', scope !== 'withEu' && `${CARD} mt-2 p-2.5`)}>
          <dl className="space-y-0.5 text-[var(--color-muted)]">
            <Row
              label={t('value.us.base')}
              value={`$ ${baseUsd.toLocaleString(locale, { maximumFractionDigits: 0 })} ≈ ${sign} ${money(baseEur)}`}
              info={t('value.us.baseInfo')}
              infoTitle={t('value.us.base')}
            />
            {hasEu && !gap && value && (
              <Row
                label={t('value.us.altValue')}
                value={formatMoneyRange(value.lowEur, value.highEur, currency, fx, locale)}
                info={t('value.us.altValueInfo', {
                  age: value.ageYears,
                  percent: Math.round(value.retained * 100),
                  spread: Math.round(value.spread * 100)
                })}
                infoTitle={t('value.us.altValue')}
              />
            )}
            {hasEu && euExTax != null && (
              <Row
                label={t('value.us.euNew')}
                value={`${sign} ${money(euExTax)}`}
                info={t('value.us.euNewInfo')}
                infoTitle={t('value.us.euNew')}
              />
            )}
            {gap && (
              <Row
                label={t('value.us.gap')}
                value={`${gap.gap > 0 ? '+' : ''}${Math.round(gap.gap * 100)} %`}
                info={t('value.us.gapInfo')}
                infoTitle={t('value.us.gap')}
              />
            )}
          </dl>

          {!hasEu && value && (
            <dl className="space-y-0.5 text-[var(--color-muted)]">
              <p className="text-xs">{t('value.ua.mid')}</p>
              <Row
                label={t('value.us.value')}
                value={`${sign} ${money(value.mid.baseEur)}`}
                info={t('value.us.valueInfo', {
                  age: value.ageYears,
                  percent: Math.round(value.retained * 100),
                  spread: Math.round(value.spread * 100)
                })}
                infoTitle={t('value.us.value')}
              />
              <Row
                label={t('value.ua.duty', { percent: PERCENT(UKR_DUTY_RATE) })}
                value={`+ ${sign} ${money(value.mid.dutyEur)}`}
              />
              <Row
                label={t('value.ua.excise', { k: value.mid.ageK })}
                value={value.mid.exciseKnown ? `+ ${sign} ${money(value.mid.exciseEur)}` : '?'}
              />
              <Row
                label={t('value.ua.vat', { percent: PERCENT(UKR_VAT_RATE) })}
                value={`+ ${sign} ${money(value.mid.vatEur)}`}
              />
              <Row strong label={t('value.ua.total')} value={`${sign} ${money(value.mid.totalEur)}`} />
            </dl>
          )}

          {!hasEu && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">{t('value.ua.currency')}</span>
              <div
                role="group"
                aria-label={t('value.ua.currency')}
                className="inline-flex overflow-hidden rounded-full border border-[var(--color-border)]"
              >
                {(['EUR', 'USD', 'UAH'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={c === currency}
                    onClick={() => onCurrencyChange(c)}
                    className={cn(
                      'px-2.5 py-0.5 text-xs font-medium transition-colors',
                      c === currency ? 'bg-sky-500/30 text-[var(--color-fg)]' : 'hover:bg-[var(--color-border)]/50'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="space-y-0.5 text-xs text-[var(--color-muted)]">
            {!hasEu && <li>⚠️ {t('value.us.warnNoEu')}</li>}
            {!hasEu && value?.extrapolated && <li>⚠️ {t('value.warn.extrapolated')}</li>}
            {!hasEu && !value?.mid.exciseKnown && <li>⚠️ {t('value.warn.exciseUnknown')}</li>}
            {(gap?.differs || agedDiffers) && <li>⚠️ {t('value.us.warnDiffers')}</li>}
            <li>ℹ️ {t('value.us.warnTrim')}</li>
          </ul>
        </div>
      </Frame>
    </div>
  )
}

type RowProps = { label: string; value: string; strong?: boolean; info?: string; infoTitle?: string }

function Row({ label, value, strong, info, infoTitle }: RowProps): ReactNode {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex justify-between gap-3',
        strong && 'border-t border-[var(--color-border)] pt-0.5 font-semibold text-[var(--color-fg)]'
      )}
    >
      <dt className="flex items-center gap-1">
        {label}
        {info && infoTitle && (
          <InfoPopover label={t('vin.info.about', { field: infoTitle })} title={infoTitle}>
            <p className="text-sm">{info}</p>
          </InfoPopover>
        )}
      </dt>
      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}

type FrameProps = { flat: boolean; title: ReactNode; info: ReactNode; children: ReactNode }

/**
 * Inside the Estimated value section the block is a plain card under the EU one (title row with its "?" inside it);
 * on its own (no EU price, VIN page) it is a collapsible section like the other VIN blocks.
 */
function Frame({ flat, title, info, children }: FrameProps): ReactNode {
  const { t } = useTranslation()
  if (!flat) {
    return (
      <VinToggleSection
        icon="💵"
        defaultOpen
        title={title}
        info={info}
        showLabel={t('value.show')}
        hideLabel={t('value.hide')}
      >
        {children}
      </VinToggleSection>
    )
  }
  return (
    <div className={cn(CARD, 'space-y-2 p-2.5')}>
      <div className="flex items-center gap-1.5 font-semibold">
        <span aria-hidden>💵</span>
        {title}
        {info}
      </div>
      {children}
    </div>
  )
}
