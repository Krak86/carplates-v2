import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AUCTIONS_DATASET_URL, PROZORRO_SALE_URL, SETAM_URL } from '@carplates/shared'
import type { Currency } from '@carplates/shared'

import ReadGuideLink from '@/components/ReadGuideLink'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import AuctionCurrency from '@/components/ua-auctions/AuctionCurrency'
import UaAuctionStatus from '@/components/ua-auctions/UaAuctionStatus'
import UaAuctionChart from '@/components/ua-auctions/UaAuctionChart'
import UaAuctionPriceCheck from '@/components/ua-auctions/UaAuctionPriceCheck'
import UaAuctionGroup from '@/components/ua-auctions/UaAuctionGroup'
import UaAuctionVehicle from '@/components/ua-auctions/UaAuctionVehicle'
import { groupLots, lotSource } from '@/components/ua-auctions/helpers'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { toIntlLocale } from '@/lib/intl'
import { auctionLotsQuery, fxQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'
import { AUCTIONS_GUIDE_PATH } from '@/routes/read/links'

type Props = {
  plate: string | null
  vin: string | null
  /** Bumped by the header chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
  /** Starts expanded without scrolling to the section (the page shows it as part of the first view). */
  startOpen?: boolean
}

const LINK_CLASS = 'text-[var(--color-primary)] underline'
const HISTORY_COUNT = 4
const WORLD_COUNT = 4

function ExternalLink({ href, children }: { href: string; children: ReactNode }): ReactNode {
  const { t } = useTranslation()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
      {children} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
    </a>
  )
}

/**
 * Collapsed "Ukrainian auctions" section (`?section=ua-auctions`; the older US-archive section is `auctions`): SETAM lots of
 * seized / confiscated property whose title named this plate or VIN, all lots newest first with sold ones highlighted. Stays
 * collapsed until the visitor opens it (header chip, share link). Closes with static copy: a short history of the Ukrainian
 * auctions, a comparison with world practice, and where to take part (link-out to the SETAM home, no per-lot URL).
 */
export default function UaAuctionCheck({ plate, vin, openSignal = 0, startOpen = false }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'ua-auctions'
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data, isError } = useQuery({ ...auctionLotsQuery(plate, vin), enabled: !!plate || !!vin })
  const title = t('uaAuctions.title')
  const locale = toIntlLocale(i18n.language)
  const lots = data?.lots ?? []
  const [currency, setCurrency] = useState<Currency>('UAH')
  const fx = useQuery({ ...fxQuery(), enabled: lots.length > 0 }).data ?? null
  const groups = groupLots(lots)
  // The merged specs only add something once a Prozorro lot (structured fields, photos) is among the lots.
  const vehicle = lots.some(l => lotSource(l) === 'prozorro') ? data?.vehicle : null

  useEffect(() => {
    if ((isShared || openSignal > 0) && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal])

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🔨"
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {title}
          {data && (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal max-sm:w-fit max-sm:basis-full">
              {lots.length > 0 ? t('uaAuctions.chip.count', { count: lots.length }) : t('uaAuctions.chip.none')}
            </span>
          )}
        </span>
      }
      info={<SectionInfo section="uaAuctions" title={title} />}
      actions={<ShareButton section="ua-auctions" label={t('share.button', { section: title })} />}
      showLabel={t('uaAuctions.show')}
      hideLabel={t('uaAuctions.hide')}
      defaultOpen={isShared || startOpen}
      openSignal={openSignal}
    >
      {isError && <p className="mb-2 text-sm text-[var(--color-muted)]">{t('uaAuctions.error')}</p>}

      {data && lots.length === 0 && <p className="mb-2 text-sm">{t('uaAuctions.empty')}</p>}

      {lots.length > 0 && (
        <>
          <UaAuctionStatus lots={lots} currency={currency} fx={fx} />

          <UaAuctionPriceCheck check={data?.priceCheck} currency={currency} fx={fx} />

          <AuctionCurrency currency={currency} onChange={setCurrency} fx={fx} />

          <UaAuctionChart lots={lots} currency={currency} fx={fx} />

          {vehicle && <UaAuctionVehicle vehicle={vehicle} />}

          {groups.map((group, i) => (
            <UaAuctionGroup
              key={group.group}
              group={group}
              currency={currency}
              fx={fx}
              collapsible={groups.length > 1}
              defaultOpen={i === 0}
            />
          ))}

          <p className="mb-2 text-xs text-[var(--color-muted)]">{t('uaAuctions.monthNote')}</p>
          <p className="mb-2 text-sm text-[var(--color-muted)]">{t('uaAuctions.caveat')}</p>
        </>
      )}

      {data && (
        <p className="text-sm text-[var(--color-muted)]">
          {data.checkedAt
            ? t('uaAuctions.checkedAt', { date: new Date(data.checkedAt).toLocaleString(locale) })
            : t('uaAuctions.neverLoaded')}
        </p>
      )}

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium">{t('uaAuctions.history.title')}</summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          {Array.from({ length: HISTORY_COUNT }, (_, i) => (
            <li key={i}>{t(`uaAuctions.history.${i + 1}`)}</li>
          ))}
        </ul>
      </details>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium">{t('uaAuctions.world.title')}</summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          {Array.from({ length: WORLD_COUNT }, (_, i) => (
            <li key={i}>{t(`uaAuctions.world.${i + 1}`)}</li>
          ))}
        </ul>
      </details>

      <ReadGuideLink guide={AUCTIONS_GUIDE_PATH} />

      <ul className="mt-2 space-y-1 text-sm">
        <li>
          <Link to="/auctions" className={LINK_CLASS}>
            {t('auctions.page.title')}
          </Link>{' '}
          <span className="text-[var(--color-muted)]">{t('auctions.page.link')}</span>
        </li>
        <li>
          <ExternalLink href={SETAM_URL}>setam.net.ua</ExternalLink>{' '}
          <span className="text-[var(--color-muted)]">{t('uaAuctions.link.setam')}</span>
        </li>
        <li>
          <ExternalLink href={PROZORRO_SALE_URL}>prozorro.sale</ExternalLink>{' '}
          <span className="text-[var(--color-muted)]">{t('uaAuctions.link.prozorro')}</span>
        </li>
        <li>
          <ExternalLink href={AUCTIONS_DATASET_URL}>data.gov.ua</ExternalLink>{' '}
          <span className="text-[var(--color-muted)]">{t('uaAuctions.link.dataset')}</span>
        </li>
      </ul>
    </VinToggleSection>
  )
}
