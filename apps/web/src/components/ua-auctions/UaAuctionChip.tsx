import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import ChipChevronButton from '@/components/ChipChevronButton'
import { auctionLotsQuery } from '@/lib/queries'

type Props = {
  plate: string | null
  vin: string | null
  /** Opens (and scrolls to) the Ukrainian auctions section. */
  onOpen: () => void
}

/**
 * "From auction" header chip, shown only when a SETAM lot named this plate / VIN. Shares its query with
 * `UaAuctionCheck`, so it costs no extra request. Neutral colour: a lot is history, not a warning.
 */
export default function UaAuctionChip({ plate, vin, onOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const { data } = useQuery({ ...auctionLotsQuery(plate, vin), enabled: !!plate || !!vin })
  if (!data || data.lots.length === 0) return null

  return (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-border)]/30 py-0.5 pr-1 pl-2 text-xs font-semibold">
      <span title={t('uaAuctions.chipTitle')} className="inline-flex items-center gap-1">
        <span aria-hidden>🔨</span>
        {data.anySold ? t('uaAuctions.chip.sold') : t('uaAuctions.chip.listed')}
      </span>
      <ChipChevronButton label={t('uaAuctions.chipTitle')} onClick={onOpen} />
    </span>
  )
}
