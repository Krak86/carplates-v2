import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionLot } from '@carplates/shared'

import { LOT_STATUS_KEYS, OPEN_STATUS, formatUah, priceDeltaPercent } from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  lot: AuctionLot
}

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[var(--color-muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  )
}

/** One SETAM lot: sold lots (a sale price exists) are highlighted green, the rest stay neutral. */
export default function UaAuctionLot({ lot }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const statusKey = LOT_STATUS_KEYS[lot.status]
  const statusLabel = statusKey ? t(`uaAuctions.status.${statusKey}`) : lot.status
  const delta = priceDeltaPercent(lot.startPrice, lot.salePrice)
  const isOpen = lot.status === OPEN_STATUS

  return (
    <li
      className={cn(
        'rounded-lg border p-3 text-sm',
        lot.sold ? 'border-green-600/60 bg-green-600/10' : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      <p className="font-semibold">
        {lot.sold ? '💰 ' : isOpen ? '🔔 ' : '🔨 '}
        {lot.sold ? t('uaAuctions.sold') : isOpen ? t('uaAuctions.open') : t('uaAuctions.notSold')}
        {` · ${statusLabel}`}
      </p>

      <dl className="mt-1.5 space-y-0.5">
        <Row label={t('uaAuctions.lotNo')} value={String(lot.lotNo)} />
        <Row label={t('uaAuctions.proceedingNo')} value={lot.proceedingNo} />
        <Row
          label={t('uaAuctions.vehicle')}
          value={[lot.make, lot.model, lot.year].filter(Boolean).join(' ') || null}
        />
        <Row label={t('uaAuctions.category')} value={lot.category} />
        <Row label={t('uaAuctions.region')} value={lot.region} />
        <Row label={t('uaAuctions.startPrice')} value={formatUah(lot.startPrice, locale)} />
        <Row
          label={t('uaAuctions.salePrice')}
          value={
            lot.salePrice !== null && (
              <>
                <strong>{formatUah(lot.salePrice, locale)}</strong>
                {delta !== null && (
                  <span className="text-[var(--color-muted)]">
                    {` (${delta > 0 ? '+' : ''}${delta}% ${t('uaAuctions.vsStart')})`}
                  </span>
                )}
              </>
            )
          }
        />
        <Row label={t('wanted.plate')} value={lot.plate} />
        <Row label={t('wanted.vin')} value={lot.vin} />
      </dl>

      <p className="mt-1.5 text-xs text-[var(--color-muted)]">
        {t('uaAuctions.titleRaw')}: {lot.title}
      </p>
    </li>
  )
}
