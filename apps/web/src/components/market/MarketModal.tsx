import { useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { MarketCard, MarketDetail } from '@carplates/shared'

import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { toIntlLocale } from '@/lib/intl'
import {
  countryFlag,
  formatMileageKm,
  formatOriginalPrice,
  formatPriceIn,
  marketGoHref,
  marketValueKey,
  marketValueText,
  seenDay
} from './helpers'
import type { MarketCurrency } from './use-market-currency'
import { useEscape } from './use-escape'
import { useMarketDetailActions } from './use-market-detail-actions'

type Props = {
  card: MarketCard
  title: string
  money: MarketCurrency
  onClose: () => void
}

/** Rows of the facts table: the label key, and the value text (null = row hidden). */
function useFacts(card: MarketCard, detail: MarketDetail | undefined): Array<[string, string]> {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const word = (value: string): string => t(marketValueKey(value), { defaultValue: marketValueText(value) })
  const yesNo = (value: boolean | null | undefined): string | null =>
    value == null ? null : t(value ? 'market.yes' : 'market.no')
  const km = formatMileageKm(card.mileage, locale)
  const rows: Array<[string, string | null]> = [
    ['market.fact.year', card.year ? String(card.year) : null],
    ['market.fact.mileage', km ? t('market.km', { km }) : null],
    ['market.fact.fuel', card.fuel ? word(card.fuel) : null],
    ['market.fact.transmission', card.transmission ? word(card.transmission) : null],
    ['market.fact.body', card.body ? word(card.body) : null],
    ['market.fact.engine', detail?.engineCc ? t('market.cc', { cc: detail.engineCc }) : null],
    ['market.fact.drive', detail?.driveType ? word(detail.driveType) : null],
    ['market.fact.seats', detail?.seatCount ? String(detail.seatCount) : null],
    ['market.fact.owners', detail?.ownerCount != null ? String(detail.ownerCount) : null],
    ['market.fact.warranty', detail?.warrantyType ? word(detail.warrantyType) : null],
    ['market.fact.inspection', yesNo(detail?.inspectionPassed)],
    ['market.fact.accident', yesNo(detail?.hasAccident ?? card.hasAccident)],
    ['market.fact.recall', yesNo(detail?.hasRecall)]
  ]
  return rows.flatMap(([key, value]) => (value ? [[key, value] as [string, string]] : []))
}

/**
 * Detail of one listing. Portaled (the card's 3D tilt would contain `position: fixed`). The only request is the detail call
 * (the API caches it ~7 days); "Open at source" is the redirect link `/api/market/go/:id`, a plain `<a>`.
 */
export default function MarketModal({ card, title, money, onClose }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  useEscape(onClose)
  const locale = toIntlLocale(i18n.language)
  const query = useMarketDetailActions(card.id)
  const detail = query.data
  const facts = useFacts(card, detail)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [failed, setFailed] = useState<readonly string[]>([])
  const photos = (detail?.photos ?? []).filter(url => !failed.includes(url))
  const main = photos[photoIndex] ?? photos[0] ?? card.thumb ?? null
  const price = formatPriceIn(card.priceUsd, money.shown, money.rates, locale)
  const original = formatOriginalPrice(card.priceOriginal, card.currencyOriginal, locale, money.shown)
  const seen = seenDay(detail?.lastSeenAt ?? card.lastSeenAt)
  const checked = seenDay(detail?.availabilityCheckedAt)

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-lg font-semibold text-primary">
              {price ?? '-'}
              {original && <span className="ml-2 text-sm font-normal text-muted">{original}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('market.close')}
            className="shrink-0 text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        {main && (
          <img
            src={main}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setFailed(urls => [...urls, main])}
            className="mb-2 max-h-72 w-full rounded-lg object-cover"
          />
        )}
        {photos.length > 1 && (
          <ul className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <li key={url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  aria-label={t('market.photoN', { n: i + 1 })}
                  className={`block overflow-hidden rounded border ${url === main ? 'border-primary' : 'border-border'}`}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(urls => [...urls, url])}
                    className="h-12 w-16 object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.isPending && <SectionSkeleton />}
        {query.isError && <p className="mb-2 text-sm text-muted">{t('market.detailError')}</p>}

        <p className="mb-2 text-sm text-muted">
          <span aria-hidden>{countryFlag(card.country)}</span> {card.region ?? card.country ?? ''}
        </p>

        {facts.length > 0 && (
          <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {facts.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted">{t(key)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {detail?.isUndervalued && (
            <span className="rounded-full border border-green-600/40 bg-green-600/10 px-2 py-0.5">
              {t('market.undervalued')}
            </span>
          )}
          {detail?.isAvailable === false && (
            <span className="rounded-full border border-amber-600/40 bg-amber-600/10 px-2 py-0.5">
              {t('market.maybeSold')}
            </span>
          )}
        </div>

        {detail?.description && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted">{t('market.summary')}</p>
            <p className="text-sm whitespace-pre-line">{detail.description}</p>
          </div>
        )}

        <p className="mb-3 text-xs text-muted">
          {t('market.attribution', { source: card.sourceName })}
          {seen ? ` · ${t('market.lastSeen', { date: seen })}` : ''}
          {checked ? ` · ${t('market.checked', { date: checked })}` : ''}
        </p>

        <a
          href={marketGoHref(card.id)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-base text-white"
        >
          {t('market.openSource', { source: card.sourceName })} ↗
          <span className="sr-only"> - {t('market.opensNewTab')}</span>
        </a>
      </div>
    </div>,
    document.body
  )
}
