import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { newCarsUrl, usedCarsUrl } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import StockRow from '@/components/StockRow'
import { useStockPhotosActions } from '@/components/use-stock-photos-actions'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { displayBrand } from '@/lib/display-brand'
import { NEW_CARS_AD_COUNT, pickDistinctAds, STOCK_ROW_MAX, USED_CARS_AD_COUNT } from '@/lib/new-cars'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
}

/**
 * Collapsed "Cars in stock" section above the paid-feature sections (shareable via `?section=stock`); the photos are
 * looked up only once it is opened. A "New" row of
 * current-model-year photos linking to the importer's new-cars page and — for brands with one — a "Used" row of the previous
 * 1–2 model years linking to its used-cars page. Each row has up to 3 cards; every photo and every ad line is distinct
 * across both rows, and a row shrinks to the photos found (hidden with none). Link-out only — nothing is copied from the importer's site.
 */
export default function StockSection({ brand }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'stock'
  const sectionRef = useRef<HTMLDivElement>(null)
  // One draw per mount: 3 different lines per row (the two rows draw from separate pools), never reshuffled on re-render.
  const [newAds] = useState(() => pickDistinctAds(STOCK_ROW_MAX, NEW_CARS_AD_COUNT))
  const [usedAds] = useState(() => pickDistinctAds(STOCK_ROW_MAX, USED_CARS_AD_COUNT))
  const [failedUrls, setFailedUrls] = useState<readonly string[]>([])
  const usedUrl = usedCarsUrl(brand)
  const [open, setOpen] = useState(() => isShared)
  // The photo lookups (up to ~24 requests) start only once the section is opened.
  const photos = useStockPhotosActions(brand ?? '', !!brand && open, !!usedUrl)
  const newTarget = newCarsUrl(brand)

  const newCards = photos.fresh.filter(p => !failedUrls.includes(p.image.url))
  const usedCards = photos.used.filter(p => !failedUrls.includes(p.image.url))
  const hasCards = (!!newTarget && newCards.length > 0) || (!!usedUrl && usedCards.length > 0)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!brand || (!newTarget && !usedUrl)) return null

  const name = displayBrand(brand)
  const year = new Date().getFullYear()
  const title = t('newCarsSection.title', { brand: name })
  const handleImageError = (imageUrl: string): void => setFailedUrls(urls => [...urls, imageUrl])

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🚗"
      title={title}
      info={<SectionInfo section="stock" title={title} />}
      actions={<ShareButton section="stock" label={t('share.button', { section: title })} />}
      showLabel={t('newCarsSection.show')}
      hideLabel={t('newCarsSection.hide')}
      defaultOpen={isShared}
      onOpenChange={setOpen}
    >
      {open && photos.isPending && <p className="text-base text-muted">{t('result.loading')}</p>}
      {open && !photos.isPending && !hasCards && <p className="text-base text-muted">{t('section.empty')}</p>}

      <StockRow
        label={t('newCarsSection.rowNew')}
        icon="🆕"
        cards={newTarget ? newCards : []}
        url={newTarget?.url ?? ''}
        adKeyPrefix="newCarsWidget.ad"
        ads={newAds}
        brandName={name}
        year={year}
        onImageError={handleImageError}
      />

      {usedUrl && (
        <StockRow
          label={t('newCarsSection.rowUsed')}
          icon="🚘"
          cards={usedCards}
          url={usedUrl}
          adKeyPrefix="newCarsSection.used"
          ads={usedAds}
          brandName={name}
          year={year}
          onImageError={handleImageError}
        />
      )}

      {hasCards && <p className="text-sm text-muted">{t('newCarsSection.disclaimer')}</p>}
    </VinToggleSection>
  )
}
