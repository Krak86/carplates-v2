import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { DEFAULT_STOCK_RANGE, stockCompanyFor, stockInstrumentsFor } from '@carplates/shared'
import type { StockRange } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import StockBonds from '@/components/StockBonds'
import StockInstrumentPanel from '@/components/StockInstrumentPanel'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  /** Catalog make page: a standalone card, open from the start. */
  standalone?: boolean
  /** Catalog pages: half the width on wide screens (the plate result card uses the full width). */
  half?: boolean
}

/**
 * Collapsed "Share price" section (shareable via `?section=shares`) for the listed company behind the make: a chip per
 * instrument it trades as (ordinary, preferred, ADR, OTC, second venue), and for the chosen one the chart, what the
 * instrument is, the facts Yahoo reports and links out; then a bonds note. Phones, tablets and the catalog pages get the
 * chart here; the desktop-only left `StockWidget` stays as it is. Hidden for a make with no listed company; the first quote
 * is fetched only once the section is opened.
 */
export default function SharePriceSection({ brand, standalone = false, half = false }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'shares'
  const sectionRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(() => isShared || standalone)
  const [range, setRange] = useState<StockRange>(DEFAULT_STOCK_RANGE)
  const [picked, setPicked] = useState<string | null>(null)
  const company = stockCompanyFor(brand)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!brand || !company) return null

  const instruments = stockInstrumentsFor(company)
  const instrument = instruments.find(i => i.symbol === picked) ?? instruments[0]!
  const title = `${t('stock.title')} - ${company.name}`

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="📈"
      title={title}
      info={<SectionInfo section="shares" title={t('stock.title')} />}
      actions={<ShareButton section="shares" label={t('share.button', { section: t('stock.title') })} />}
      showLabel={t('stock.show')}
      hideLabel={t('stock.hide')}
      defaultOpen={isShared || standalone}
      bordered={!standalone}
      onOpenChange={setOpen}
    >
      {open && (
        <div className={cn('flex w-full flex-col gap-3', half && 'sm:w-1/2')}>
          {instruments.length > 1 && (
            <div role="group" aria-label={t('stock.instruments')} className="flex flex-wrap gap-1.5">
              {instruments.map(i => (
                <button
                  key={i.symbol}
                  type="button"
                  aria-pressed={i.symbol === instrument.symbol}
                  onClick={() => setPicked(i.symbol)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-left text-xs',
                    i.symbol === instrument.symbol
                      ? 'border-primary bg-primary/10 text-fg'
                      : 'border-border text-muted hover:bg-surface'
                  )}
                >
                  <span className="font-semibold">{i.symbol}</span>{' '}
                  <span className="opacity-80">{t(`stock.kind.${i.kind}`)}</span>
                </button>
              ))}
            </div>
          )}

          <StockInstrumentPanel
            key={instrument.symbol}
            brand={brand}
            companyName={company.name}
            instrument={instrument}
            range={range}
            onRangeChange={setRange}
            tall={!half}
          />

          <StockBonds companyName={company.name} symbol={company.symbol} />

          <p className="text-sm text-muted">{t('stock.disclaimer')}</p>
        </div>
      )}
    </VinToggleSection>
  )
}
