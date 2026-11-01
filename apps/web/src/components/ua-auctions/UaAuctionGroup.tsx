import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse } from '@carplates/shared'

import Timeline from '@/components/Timeline'
import UaAuctionLot from '@/components/ua-auctions/UaAuctionLot'
import { LOT_STATUS_KEYS, VISIBLE_NOT_SOLD, lotKey, visibleLots } from '@/components/ua-auctions/helpers'
import type { LotGroup } from '@/components/ua-auctions/helpers'

type Props = {
  group: LotGroup
  currency: Currency
  fx: FxResponse | null
  /** Wraps the lots in a collapsible block headed by the subcategory, its lot count and its latest status; off = a bare timeline. */
  collapsible: boolean
  /** The block starts open (the group with the latest lot). */
  defaultOpen: boolean
}

/** One subcategory of the lot list: newest lots first, sold and open lots always, a few not-sold ones and "show more" for the rest. */
export default function UaAuctionGroup({ group, currency, fx, collapsible, defaultOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const { shown, hidden, notSold } = visibleLots(group.lots, showAll)
  const latest = group.lots[0]
  const statusKey = latest ? LOT_STATUS_KEYS[latest.status] : undefined

  const body = (
    <>
      <Timeline
        items={shown.map(lot => ({
          key: lotKey(lot),
          highlight: lot.sold,
          content: <UaAuctionLot lot={lot} currency={currency} fx={fx} />
        }))}
        highlightFirst={false}
      />

      {(hidden > 0 || (showAll && notSold > VISIBLE_NOT_SOLD)) && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mb-2 text-sm text-[var(--color-primary)] underline"
        >
          {showAll ? t('uaAuctions.less') : t('uaAuctions.more', { count: hidden })}
        </button>
      )}
    </>
  )

  if (!collapsible) return body

  return (
    <details open={defaultOpen} className="mb-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold">
        {t(`uaAuctions.group.${group.group}`)}
        <span className="font-normal text-[var(--color-muted)]">
          {` · ${t('uaAuctions.group.count', { count: group.lots.length })}`}
          {latest &&
            ` · ${t('uaAuctions.group.latest')}: ${statusKey ? t(`uaAuctions.status.${statusKey}`) : latest.status}`}
        </span>
      </summary>
      <div className="mt-2">{body}</div>
    </details>
  )
}
