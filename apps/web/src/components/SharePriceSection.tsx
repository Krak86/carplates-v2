import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { DEFAULT_STOCK_RANGE, stockCompanyFor } from '@carplates/shared'
import type { StockRange } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import StockQuote from '@/components/StockQuote'
import { cn } from '@/lib/cn'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { stockQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  /** Catalog make page: a standalone card, open from the start. */
  standalone?: boolean
  /** Catalog pages: half the width on wide screens (the plate result card uses the full width). */
  half?: boolean
}

/**
 * Collapsed "Share price" section (shareable via `?section=shares`): the listed company behind the make, same quote as
 * the desktop-only left-hand `StockWidget` (one query key, so on a wide screen the default range is already cached).
 * This is the way phones, tablets and the catalog pages get the chart. Hidden for a make with no listed company; the
 * quote is fetched only once the section is opened.
 */
export default function SharePriceSection({ brand, standalone = false, half = false }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'shares'
  const sectionRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(() => isShared || standalone)
  const [range, setRange] = useState<StockRange>(DEFAULT_STOCK_RANGE)
  const listed = !!brand && !!stockCompanyFor(brand)
  const stock = useQuery({ ...stockQuery(brand ?? '', range), enabled: listed && open, placeholderData: prev => prev })

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!listed) return null

  const data = stock.data
  const company = data?.company
  const title = company ? `${t('stock.title')} - ${company.name}` : t('stock.title')
  // An upstream hiccup returns an empty series: say so once settled instead of an endless skeleton.
  const isEmpty = open && !stock.isPending && (!data || !company || data.points.length < 2)

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
      {open && stock.isPending && <SectionSkeleton />}
      {isEmpty && <p className="text-base text-[var(--color-muted)]">{t('section.empty')}</p>}

      {data && company && data.points.length >= 2 && (
        <div className={cn('flex w-full flex-col gap-2', half && 'sm:w-1/2')}>
          <StockQuote data={data} range={range} onRangeChange={setRange} tall={!half} />
          <p className="text-sm text-[var(--color-muted)]">{t('stock.disclaimer')}</p>
        </div>
      )}
    </VinToggleSection>
  )
}
