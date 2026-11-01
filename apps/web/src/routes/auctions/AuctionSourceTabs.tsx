import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AUCTION_SOURCES } from '@carplates/shared'
import type { AuctionSource } from '@carplates/shared'

import InfoPopover from '@/components/InfoPopover'
import { cn } from '@/lib/cn'

type Props = {
  /** Undefined = both sources. */
  source: AuctionSource | undefined
  onChange: (source: AuctionSource | undefined) => void
}

/** All | SETAM | Prozorro.Sale switch over the lot list; sets the same `source` filter the URL carries. */
export default function AuctionSourceTabs({ source, onChange }: Props): ReactNode {
  const { t } = useTranslation()
  const tabs: readonly (AuctionSource | undefined)[] = [undefined, ...AUCTION_SOURCES]

  return (
    <div className="mb-3 flex items-center gap-2">
      <div
        role="tablist"
        aria-label={t('auctions.page.sourceLabel')}
        className="flex min-w-0 gap-1 rounded-full bg-[var(--color-border)]/30 p-1"
      >
        {tabs.map(tab => (
          <button
            key={tab ?? 'all'}
            type="button"
            role="tab"
            aria-selected={source === tab}
            onClick={() => onChange(tab)}
            className={cn(
              'rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors',
              source === tab ? 'bg-[var(--color-surface)] font-medium shadow-sm' : 'text-[var(--color-muted)]'
            )}
          >
            {tab ? t(`uaAuctions.source.${tab}`) : t('auctions.page.sourceAll')}
          </button>
        ))}
      </div>
      <InfoPopover
        label={t('auctions.page.helpLabel', { field: t('auctions.page.sourceLabel') })}
        title={t('auctions.page.sourceLabel')}
      >
        <p>{t('auctions.page.help.source')}</p>
      </InfoPopover>
    </div>
  )
}
