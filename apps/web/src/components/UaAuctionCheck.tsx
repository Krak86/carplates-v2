import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AUCTIONS_DATASET_URL, PROZORRO_SALE_URL, SETAM_URL } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import UaAuctionLot from '@/components/ua-auctions/UaAuctionLot'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { toIntlLocale } from '@/lib/intl'
import { auctionLotsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  plate: string | null
  vin: string | null
  /** Bumped by the header chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
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
 * seized / confiscated property whose title named this plate or VIN, all lots newest first with sold ones highlighted. Opens by
 * itself when there is a lot. Closes with static copy: a short history of the Ukrainian auctions, a comparison with
 * world practice, and where to take part (link-out to the SETAM home, no per-lot URL).
 */
export default function UaAuctionCheck({ plate, vin, openSignal = 0 }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'ua-auctions'
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data, isError } = useQuery({ ...auctionLotsQuery(plate, vin), enabled: !!plate || !!vin })
  const title = t('uaAuctions.title')
  const locale = toIntlLocale(i18n.language)
  const lots = data?.lots ?? []

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
      defaultOpen={isShared}
      openSignal={openSignal + (lots.length > 0 ? 1 : 0)}
    >
      {isError && <p className="mb-2 text-sm text-[var(--color-muted)]">{t('uaAuctions.error')}</p>}

      {data && lots.length === 0 && <p className="mb-2 text-sm">{t('uaAuctions.empty')}</p>}

      {lots.length > 0 && (
        <>
          <ul className="mb-2 space-y-2">
            {lots.map(lot => (
              <UaAuctionLot key={lot.lotNo} lot={lot} />
            ))}
          </ul>
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

      <ul className="mt-2 space-y-1 text-sm">
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
