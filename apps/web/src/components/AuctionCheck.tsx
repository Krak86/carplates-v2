import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import AuctionVinModal from '@/components/AuctionVinModal'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { AUCTION_REGION_ICON, AUCTION_SITES, auctionOpenUrl, auctionSitesByTier } from '@/lib/auction-sites'
import type { AuctionSiteId } from '@/lib/auction-sites'
import { copyToClipboard, scrollElementIntoView } from '@/lib/share-section'

type Props = {
  vin: string
  /** The registration history shows the car was brought in from abroad — adds the "possible auction car" chip. */
  imported?: boolean
  /** Bumped by the "imported" status chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
}

const FACT_COUNT = 4

const ROW_CLASS =
  'flex w-full items-start justify-between gap-3 rounded-md px-2 py-1.5 text-left text-base text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)]/40'

/**
 * Collapsed "Auction history" section (shareable via `?section=auctions`): links to public auction archives (Copart /
 * IAAI re-publishers) to see whether this VIN was ever sold as a damaged lot. Archives that bind a search to a visitor
 * session open a modal with the VIN to copy (language-aware home pages). A short "more resources" list closes the section.
 * Link-out only — nothing is sent from here.
 */
export default function AuctionCheck({ vin, imported = false, openSignal = 0 }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'auctions'
  const sectionRef = useRef<HTMLDivElement>(null)
  const [modalId, setModalId] = useState<AuctionSiteId | null>(null)
  const title = t('auctions.title')
  const modalSite = AUCTION_SITES.find(site => site.id === modalId)

  useEffect(() => {
    if ((isShared || openSignal > 0) && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal])

  const renderSite = (site: (typeof AUCTION_SITES)[number], showRegion: boolean): ReactNode => {
    const direct = !!site.searchUrl
    const body = (
      <>
        <span className="min-w-0">
          <span className="block underline">
            {showRegion && <span aria-hidden>{AUCTION_REGION_ICON[site.region]} </span>}
            {t(`auctions.site.${site.id}.name`)}
          </span>
          <span className="block text-sm text-[var(--color-muted)]">
            {t(`auctions.site.${site.id}.desc`)}
            {site.tier === 'main' && ` · ${t(direct ? 'auctions.modeDirect' : 'auctions.modeManual')}`}
          </span>
        </span>
        <span aria-hidden>{direct ? '↗' : '📋'}</span>
      </>
    )

    return (
      <li key={site.id}>
        {direct ? (
          <a
            href={auctionOpenUrl(site, vin, i18n.language)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            // The site may ignore the URL parameter: the VIN is on the clipboard for a manual paste.
            onClick={() => void copyToClipboard(vin)}
            className={ROW_CLASS}
          >
            {body}
            <span className="sr-only">{t('field.opensNewTab')}</span>
          </a>
        ) : (
          <button type="button" onClick={() => setModalId(site.id)} className={ROW_CLASS}>
            {body}
          </button>
        )}
      </li>
    )
  }

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🔨"
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {title}
          {imported && (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal max-sm:w-fit max-sm:basis-full">
              🌍 {t('auctions.importedChip')}
            </span>
          )}
        </span>
      }
      info={<SectionInfo section="auctions" title={title} />}
      actions={<ShareButton section="auctions" label={t('share.button', { section: title })} />}
      showLabel={t('auctions.show')}
      hideLabel={t('auctions.hide')}
      defaultOpen={isShared}
      openSignal={openSignal}
    >
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('auctions.intro')}</p>
      <ul className="space-y-1">{auctionSitesByTier('main').map(site => renderSite(site, false))}</ul>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('auctions.note')}</p>

      <div className="mt-3">
        <div className="mb-1 text-sm font-semibold">🧭 {t('auctions.extraTitle')}</div>
        <p className="mb-1 text-sm text-[var(--color-muted)]">{t('auctions.extraIntro')}</p>
        <ul className="space-y-1">{auctionSitesByTier('extra').map(site => renderSite(site, true))}</ul>
      </div>

      <div className="mt-3 rounded-lg bg-[var(--color-border)]/30 p-3 text-sm">
        <div className="mb-1 font-semibold">💡 {t('auctions.factsTitle')}</div>
        <ul className="list-disc space-y-1 pl-5">
          {Array.from({ length: FACT_COUNT }, (_, i) => (
            <li key={i}>{t(`auctions.fact.${i + 1}`)}</li>
          ))}
        </ul>
      </div>

      {modalSite && (
        <AuctionVinModal
          vin={vin}
          siteName={t(`auctions.site.${modalSite.id}.name`)}
          url={auctionOpenUrl(modalSite, vin, i18n.language)}
          onClose={() => setModalId(null)}
        />
      )}
    </VinToggleSection>
  )
}
