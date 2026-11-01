import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AUCTION_TYPES } from '@carplates/shared'
import type { AuctionGroup, AuctionLot, AuctionSource, AuctionType } from '@carplates/shared'

import { knownValue, lotGroup, lotSource } from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'

/** What the list is filtered by; a chip that matches it is shown as selected and a click on it clears that filter. */
export type ChipFilter = { source?: AuctionSource; group?: AuctionGroup; auctionType?: AuctionType }

type Props = {
  lot: Pick<AuctionLot, 'source' | 'group' | 'auctionType'>
  /** Makes the chips filter buttons: called with the URL params to set (`null` clears one). */
  onSelect?: (changes: Record<string, string | null>) => void
  selected?: ChipFilter
}

const CHIP = 'rounded-full border px-2 py-0.5 text-xs font-normal'

// Full class names, so Tailwind finds them.
const SOURCE_COLOR: Readonly<Record<AuctionSource, string>> = {
  setam: 'border-sky-500/60 bg-sky-500/15',
  prozorro: 'border-violet-500/60 bg-violet-500/15'
}

const GROUP_COLOR: Readonly<Record<AuctionGroup, string>> = {
  setam: 'border-sky-500/60 bg-sky-500/15',
  customs: 'border-amber-500/60 bg-amber-500/15',
  bankruptcy: 'border-rose-500/60 bg-rose-500/15',
  privatization: 'border-emerald-500/60 bg-emerald-500/15',
  state: 'border-slate-400/60 bg-slate-400/15',
  bank: 'border-cyan-500/60 bg-cyan-500/15',
  arma: 'border-red-500/60 bg-red-500/15',
  commercial: 'border-indigo-500/60 bg-indigo-500/15',
  lease: 'border-fuchsia-500/60 bg-fuchsia-500/15'
}

const TYPE_COLOR: Readonly<Record<AuctionType, string>> = {
  english: 'border-lime-500/60 bg-lime-500/15',
  dutch: 'border-orange-500/60 bg-orange-500/15',
  withoutAuction: 'border-teal-500/60 bg-teal-500/15',
  priorityEnglish: 'border-pink-500/60 bg-pink-500/15'
}

type ChipProps = { label: string; color: string; selected: boolean; onClick?: () => void }

function Chip({ label, color, selected, onClick }: ChipProps): ReactNode {
  const { t } = useTranslation()
  const className = cn(CHIP, color, selected && 'ring-2 ring-[var(--color-primary)]')
  if (!onClick) return <span className={className}>{label}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={t(selected ? 'uaAuctions.chip.clearFilter' : 'uaAuctions.chip.setFilter', { label })}
      className={cn(className, 'cursor-pointer hover:brightness-125')}
    >
      {label}
    </button>
  )
}

/**
 * Source, subcategory and (Prozorro) auction-type chips of a lot, each in its own colour. On the `/auctions` list they are
 * filter buttons; in the car card they are plain labels.
 */
export default function UaAuctionChips({ lot, onSelect, selected }: Props): ReactNode {
  const { t } = useTranslation()
  const source = lotSource(lot)
  const group = lotGroup(lot)
  const type = knownValue(AUCTION_TYPES, lot.auctionType) as AuctionType | null

  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      <Chip
        label={t(`uaAuctions.source.${source}`)}
        color={SOURCE_COLOR[source]}
        selected={selected?.source === source}
        onClick={onSelect && (() => onSelect({ source: selected?.source === source ? null : source }))}
      />
      <Chip
        label={t(`uaAuctions.group.${group}`)}
        color={GROUP_COLOR[group]}
        selected={selected?.group === group}
        // A category belongs to one source, so picking it also picks the source (and clearing it leaves the source).
        onClick={onSelect && (() => onSelect(selected?.group === group ? { group: null } : { group, source }))}
      />
      {type && (type !== 'english' || selected?.auctionType === 'english') && (
        <Chip
          label={t(`uaAuctions.auctionType.${type}`)}
          color={TYPE_COLOR[type]}
          selected={selected?.auctionType === type}
          onClick={onSelect && (() => onSelect({ type: selected?.auctionType === type ? null : type }))}
        />
      )}
    </span>
  )
}
