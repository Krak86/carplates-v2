import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { Currency } from '@carplates/shared'

import { effectiveCurrency, formatMoneyRange, ukrPrice } from '@/components/EstimatedValue.helpers'
import InfoPopover from '@/components/InfoPopover'
import { cn } from '@/lib/cn'
import { fxQuery, rdwQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

// Closed parts load on demand: the panel on first open (or hover / focus of the chevron), the popover bodies on first show.
const loadPanel = (): Promise<typeof import('@/components/EstimatedValuePanel')> =>
  import('@/components/EstimatedValuePanel')
const EstimatedValuePanel = lazy(loadPanel)
const EstimatedValueTip = lazy(() => import('@/components/EstimatedValueTip'))
const EstimatedValueDetails = lazy(() => import('@/components/EstimatedValueDetails'))

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind text (ЛЕГКОВИЙ, МОТОЦИКЛ …): picks which RDW vehicle kinds the model may match. */
  kind?: string | null
  /** Registry fuel text and engine capacity: the inputs to Ukrainian excise. */
  fuel?: string | null
  capacity?: number | null
}

/**
 * Green "~ € X–Y" chip: the EU value estimate (Dutch new price x depreciation curve) plus Ukrainian customs — what the
 * car would cost to import today. A chevron opens the clean EU value, the duty / excise / VAT breakdown, the NBU
 * currency switch and the caveats; a "?" explains everything. Shares the Specs block's `/api/rdw` query; renders
 * nothing while loading, on error or when there is no RDW price to start from.
 */
export default function EstimatedValueChip({ brand, model, year, kind, fuel, capacity }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'value'
  const [open, setOpen] = useState(() => isShared)
  // The panel is mounted (and its chunk fetched) on first open and then kept, so closing still animates.
  const [panelRequested, setPanelRequested] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [wanted, setWanted] = useState<Currency>('EUR')
  const { data } = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year)
  })
  // The NBU rates are only needed once the panel is opened; until they arrive (or if they fail) the chip stays in euros.
  const fxResult = useQuery({ ...fxQuery(), enabled: open })
  const fx = fxResult.data ?? null
  const match = data?.match
  const estimate = match?.valueEstimate
  const hasEstimate = !!estimate

  // A shared link opens the panel (initial state) and scrolls to it once the estimate has rendered.
  useEffect(() => {
    if (isShared && hasEstimate && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, hasEstimate])

  if (!match || !estimate || !year) return null

  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const currency = effectiveCurrency(wanted, fx)
  const price = ukrPrice(match, estimate, { fuel, capacityCc: capacity, makeYear: year }, new Date().getFullYear())
  const range = formatMoneyRange(price.low.totalEur, price.high.totalEur, currency, fx, locale)
  const rough = estimate.rough || estimate.extrapolated

  function handleToggle(): void {
    setPanelRequested(true)
    setOpen(v => !v)
  }

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <InfoPopover
          label={t('value.chipHint')}
          title={t('value.title')}
          triggerClassName="inline-flex cursor-help items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-0.5 text-base font-semibold text-emerald-800 dark:text-emerald-300"
          trigger={
            <>
              {range}
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

        <button
          type="button"
          aria-expanded={open}
          aria-controls="value-breakdown"
          aria-label={t(open ? 'value.ua.collapse' : 'value.ua.expand')}
          onClick={handleToggle}
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
          className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/30 dark:text-emerald-300"
        >
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className={cn(
              'size-3 transition-transform duration-300 ease-out motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          >
            <path
              d="M2 4.5 6 8.5 10 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <InfoPopover label={t('vin.info.about', { field: t('value.title') })} title={t('value.title')}>
          <Suspense fallback={null}>
            <EstimatedValueDetails match={match} estimate={estimate} locale={locale} />
          </Suspense>
        </InfoPopover>
      </div>

      {/* grid-rows 0fr -> 1fr animates the height; opacity + translate (compositor-only) carry the visible motion. */}
      <div
        id="value-breakdown"
        ref={sectionRef}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity,translate] duration-300 ease-out will-change-[opacity,translate] motion-reduce:transition-none',
          open ? 'mt-1.5 translate-y-0 grid-rows-[1fr] opacity-100' : '-translate-y-1 grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          {panelRequested && (
            <Suspense fallback={<p className="p-2 text-sm text-[var(--color-muted)]">{t('result.loading')}</p>}>
              <EstimatedValuePanel
                match={match}
                estimate={estimate}
                price={price}
                fuel={fuel}
                makeYear={year}
                currency={currency}
                onCurrencyChange={setWanted}
                fx={fx}
                locale={locale}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
