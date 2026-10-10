import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { Currency } from '@carplates/shared'

import EstimatedValuePill from '@/components/EstimatedValuePill'
import EstimatedValueDetails from '@/components/EstimatedValueDetails'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import UkrPriceBreakdown from '@/components/UkrPriceBreakdown'
import { useEstimatedValue, type ValueInput } from '@/components/use-estimated-value'
import ValuePriceByFuel from '@/components/ValuePriceByFuel'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = ValueInput & {
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  /** Bumped by the card-header chevron: each change opens the section and scrolls to it (0 = never asked). */
  openSignal: number
}

/**
 * "Estimated value" section — the one place for everything price-related: the green range pill (copy, tip, "?"), the EU
 * value and Ukrainian customs breakdown with the NBU currency switch, the new price per fuel version, and the
 * "Charts and explanation" folder. Collapsed by default; opens from the header chevron (`openSignal`) or a
 * `?section=value` share link. Lazy: mounted by `LazySection`, so its queries and chunk start near the viewport.
 */
export default function EstimatedValueSection({
  currency: wanted,
  onCurrencyChange,
  openSignal,
  ...input
}: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'value'
  const [open, setOpen] = useState(() => isShared || openSignal > 0)
  const [seenSignal, setSeenSignal] = useState(openSignal)
  const sectionRef = useRef<HTMLDivElement>(null)
  const value = useEstimatedValue(input, wanted)
  const ready = !!value

  // A new chevron click opens the section (derived during render, no effect).
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal)
    setOpen(true)
  }

  // Chevron click or shared link: scroll once the section is rendered.
  useEffect(() => {
    if ((isShared || openSignal > 0) && ready && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal, ready])

  if (!value) return null

  const { match, estimate, price, currency, fx, locale } = value

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="💶"
        title={t('value.title')}
        info={
          <InfoPopover label={t('vin.info.about', { field: t('value.title') })} title={t('value.title')}>
            <InfoText text={t('value.sectionInfo')} highlight={['RDW', 'NBU']} />
          </InfoPopover>
        }
        actions={<ShareButton section="value" label={t('share.button', { section: t('value.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('value.show')}
        hideLabel={t('value.hide')}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-2">
            <EstimatedValuePill value={value} />

            <UkrPriceBreakdown
              match={match}
              estimate={estimate}
              price={price}
              makeYear={input.year ?? 0}
              fuel={input.fuel}
              currency={currency}
              onCurrencyChange={onCurrencyChange}
              fx={fx}
              locale={locale}
            />

            {(match.priceByFuel?.length ?? 0) >= 2 && (
              <ValuePriceByFuel
                fuels={match.priceByFuel ?? []}
                retained={estimate.retained}
                currency={currency}
                fx={fx}
                locale={locale}
              />
            )}

            <VinToggleSection
              nested
              icon="📂"
              defaultOpen={false}
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  <span aria-hidden>📊</span> {t('value.details.title')}
                </>
              }
            >
              <div className="p-3">
                <EstimatedValueDetails match={match} estimate={estimate} locale={locale} currency={currency} fx={fx} />
              </div>
            </VinToggleSection>
          </div>
        </div>
      </div>
    </div>
  )
}
