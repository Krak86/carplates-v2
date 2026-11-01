import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionLot } from '@carplates/shared'

import { knownValue, lotGroup, lotSource } from '@/components/ua-auctions/helpers'

type Props = {
  lot: Pick<AuctionLot, 'source' | 'group' | 'auctionType'>
}

const AUCTION_TYPES = ['english', 'dutch', 'withoutAuction', 'priorityEnglish'] as const
const CHIP = 'rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal'

/** Source, subcategory and (Prozorro) auction-type chips of a lot. */
export default function UaAuctionChips({ lot }: Props): ReactNode {
  const { t } = useTranslation()
  const type = knownValue(AUCTION_TYPES, lot.auctionType)

  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      <span className={CHIP}>{t(`uaAuctions.source.${lotSource(lot)}`)}</span>
      <span className={CHIP}>{t(`uaAuctions.group.${lotGroup(lot)}`)}</span>
      {type && type !== 'english' && <span className={CHIP}>{t(`uaAuctions.auctionType.${type}`)}</span>}
    </span>
  )
}
