import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { setamLotUrl } from '@carplates/shared'
import type { AuctionLot, Currency, FxResponse } from '@carplates/shared'

import {
  LOT_STATUS_KEYS,
  OPEN_STATUS,
  formatLotMonth,
  formatPrice,
  priceDeltaPercent
} from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  lot: AuctionLot
  currency: Currency
  fx: FxResponse | null
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

/**
 * One SETAM lot as a timeline entry. A sold lot (a sale price exists) and an open one are full green / neutral tiles; a lot
 * that was not sold is a one-line summary that opens to the same details, so a long re-listing history stays short.
 */
export default function UaAuctionLot({ lot, currency, fx }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const statusKey = LOT_STATUS_KEYS[lot.status]
  const statusLabel = statusKey ? t(`uaAuctions.status.${statusKey}`) : lot.status
  const delta = priceDeltaPercent(lot.startPrice, lot.salePrice)
  const isOpen = lot.status === OPEN_STATUS
  const month = formatLotMonth(lot.month, locale)
  const verdict = lot.sold ? t('uaAuctions.sold') : isOpen ? t('uaAuctions.open') : t('uaAuctions.notSold')
  const icon = lot.sold ? '💰' : isOpen ? '🔔' : '🔨'

  const details = (
    <>
      <dl className="mt-1.5 space-y-0.5">
        <Row
          label={t('uaAuctions.lotNo')}
          value={
            <a
              href={setamLotUrl(lot.lotNo)}
              target="_blank"
              rel="noopener noreferrer"
              title={t('uaAuctions.openOnSetam')}
              className="underline"
            >
              {lot.lotNo} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
            </a>
          }
        />
        <Row label={t('uaAuctions.proceedingNo')} value={lot.proceedingNo} />
        <Row
          label={t('uaAuctions.vehicle')}
          value={[lot.make, lot.model, lot.year].filter(Boolean).join(' ') || null}
        />
        <Row label={t('uaAuctions.category')} value={lot.category} />
        <Row label={t('uaAuctions.region')} value={lot.region} />
        <Row label={t('uaAuctions.startPrice')} value={formatPrice(lot.startPrice, currency, fx, locale)} />
        <Row
          label={t('uaAuctions.salePrice')}
          value={
            lot.salePrice !== null && (
              <>
                <strong>{formatPrice(lot.salePrice, currency, fx, locale)}</strong>
                {delta !== null && delta !== 0 && (
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
    </>
  )

  if (!lot.sold && !isOpen) {
    return (
      <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-border)]/20 px-3 py-2 text-sm">
        <summary className="cursor-pointer">
          <span className="font-semibold">
            {icon} {month ? `${month} · ` : ''}
            {verdict}
          </span>
          <span className="text-[var(--color-muted)]">
            {` · ${statusLabel}`}
            {lot.startPrice !== null && ` · ${formatPrice(lot.startPrice, currency, fx, locale)}`}
          </span>
        </summary>
        {details}
      </details>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        lot.sold ? 'border-green-600/60 bg-green-600/10' : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      <p className="font-semibold">
        {icon} {month ? `${month} · ` : ''}
        {verdict}
        {` · ${statusLabel}`}
      </p>
      {details}
    </div>
  )
}
