import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { Registration, WantedResponse } from '@carplates/shared'
import type { TFunction } from 'i18next'

import CopyButton from '@/components/CopyButton'
import InfoPopover from '@/components/InfoPopover'
import Timeline from '@/components/Timeline'
import type { TimelineItem } from '@/components/Timeline'
import {
  OPEN_STATUS,
  formatLotMonth,
  formatPrice,
  lotKey,
  lotLink,
  lotNumber,
  timelineLots
} from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionLotsQuery, wantedQuery } from '@/lib/queries'
import { depMapsUrl } from '@/lib/maps'
import { type OperCategory, operCategory, operInfoKey } from '@/lib/oper-info'
import { plateRegionLabel } from '@/lib/plate-region'

/** `badge` tints the category pill, `bar` is the matching accent bar left of the operation name. */
const CATEGORY_STYLES: Record<OperCategory, { badge: string; bar: string }> = {
  new: { badge: 'bg-green-600/15 text-green-700 dark:text-green-400', bar: 'border-green-600' },
  import: {
    badge: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
    bar: 'border-[var(--color-primary)]'
  },
  owner: {
    badge: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
    bar: 'border-[var(--color-primary)]'
  },
  modification: { badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-400', bar: 'border-amber-500' },
  deregistered: { badge: 'bg-red-600/15 text-red-700 dark:text-red-400', bar: 'border-red-600' },
  noise: { badge: 'bg-[var(--color-border)]/60 text-[var(--color-muted)]', bar: 'border-[var(--color-border)]' }
}

type Props = {
  actions: Registration[]
  /** The plate already shown on this page — its own rows render as plain text, not a link to itself. */
  currentPlate?: string
  /** Plate / VIN to look up Ukrainian auction lots for; each lot becomes a marker among the operations. Omit for none. */
  auctionKeys?: { plate: string | null; vin: string | null }
}

/** Puts each lot marker into the action items at its position (`at` = index in the action list, ascending after the sort). */
function mergeLots(items: TimelineItem[], lots: readonly { at: number; item: TimelineItem }[]): TimelineItem[] {
  const merged = [...items]
  ;[...lots]
    .sort((a, b) => a.at - b.at)
    .forEach((l, i) => {
      merged.splice(l.at + i, 0, l.item)
    })
  return merged
}

/** Where a dated marker goes in a newest-first list: above the first action registered on or before `day` (a full date or a month). */
function insertIndex(actions: readonly Registration[], day: string | null): number {
  const at = actions.findIndex(a => !!a.dReg && !!day && a.dReg.slice(0, day.length) <= day)
  return at === -1 ? actions.length : at
}

/** Wanted-list events of this plate / VIN as timeline markers: put on the list (taking date) and, once known, taken off. */
function wantedMarkers(
  data: WantedResponse | undefined,
  t: TFunction,
  locale: string
): { day: string | null; item: TimelineItem }[] {
  const fmt = (iso: string): string => new Date(iso).toLocaleDateString(locale)
  const events: { id: string; icon: string; key: string; iso: string | null }[] = []

  for (const r of data?.records ?? []) {
    events.push({ id: `w-${r.id}`, icon: '🚨', key: 'added', iso: r.seizedAt ?? r.registeredAt })
    // A month-only removal carries our scrape time, not the real date: leave it out rather than show a wrong one.
    if (r.status === 'removed' && r.removedExact !== false) {
      events.push({ id: `w-${r.id}-off`, icon: '✔️', key: 'removed', iso: r.removedAt })
    }
  }
  for (const r of data?.plates ?? []) {
    events.push({ id: `g-${r.id}`, icon: '🔎', key: 'plateAdded', iso: r.seizedAt ?? r.insertedAt })
    if (r.status === 'removed') events.push({ id: `g-${r.id}-off`, icon: '✔️', key: 'plateRemoved', iso: r.removedAt })
  }

  return events
    .filter(e => !!e.iso)
    .map(e => ({
      day: (e.iso as string).slice(0, 10),
      item: {
        key: e.id,
        content: (
          <div className="text-sm">
            <span aria-hidden>{e.icon}</span>{' '}
            <span className="font-medium">{t(`wanted.timeline.${e.key}`, { date: fmt(e.iso as string) })}</span>
          </div>
        )
      } satisfies TimelineItem
    }))
}

/**
 * Registration actions as a shipping-style vertical timeline: a point + connecting arrow per step.
 * `actions` arrives newest-first (the API's history order) and is rendered in that order, latest on
 * top — but the connecting arrows point up, since that's the direction the dates actually run in
 * (each step is newer than the one below it).
 */
export default function RegistrationTimeline({ actions, currentPlate, auctionKeys }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const keys = auctionKeys ?? { plate: null, vin: null }
  const lots =
    useQuery({ ...auctionLotsQuery(keys.plate, keys.vin), enabled: !!keys.plate || !!keys.vin }).data?.lots ?? []
  const wanted = useQuery({ ...wantedQuery(keys.plate, keys.vin), enabled: !!keys.plate || !!keys.vin }).data
  const locale = toIntlLocale(i18n.language)

  const lotItems = timelineLots(lots).map(lot => ({
    at: insertIndex(actions, lot.month ?? null),
    lot,
    item: {
      key: `lot-${lotKey(lot)}`,
      highlight: lot.sold,
      content: (
        <div className="text-sm">
          <span aria-hidden>🔨</span>{' '}
          <span className="font-medium">
            {t(`uaAuctions.timeline.${lot.sold ? 'sold' : lot.status === OPEN_STATUS ? 'open' : 'notSold'}`, {
              month: formatLotMonth(lot.month, locale) ?? '-',
              price: formatPrice(lot.salePrice ?? lot.startPrice, 'UAH', null, locale) ?? '-'
            })}
          </span>{' '}
          {lotLink(lot) && (
            <a
              href={lotLink(lot) ?? undefined}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-[var(--color-muted)] underline"
            >
              {t('uaAuctions.lotNo')} {lotNumber(lot)} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
            </a>
          )}
        </div>
      )
    } satisfies TimelineItem
  }))

  return (
    <Timeline
      arrows="up"
      items={mergeLots(
        actions.map((action, index) => {
          // Foreign/transit prefixes and plateless (2026+) rows have no oblast match — say so rather than going blank.
          const region = plateRegionLabel(action.plate, t, i18n.language)
          // Brand / model / year / VIN show on the newest row and again wherever any of them changes going back in time
          // (plate reassigned to another car, or a row that published no VIN).
          const newer = actions[index - 1]
          const showVehicle =
            !newer ||
            newer.brand !== action.brand ||
            newer.model !== action.model ||
            newer.makeYear !== action.makeYear ||
            newer.vin !== action.vin
          const category = operCategory(action.operCode)
          const vehicleLabel = [action.brand, action.model].filter(Boolean).join(' ')

          return {
            key: `${action.dReg}-${action.operCode}`,
            content: (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 font-medium">
                    {action.dReg ?? '-'}
                  </span>
                  <span className="flex items-center gap-2 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right font-medium">
                    {!action.plate ? (
                      '-'
                    ) : action.plate === currentPlate ? (
                      action.plate
                    ) : (
                      <>
                        <Link viewTransition to={`/${action.plate}`} className="text-[var(--color-primary)] underline">
                          {action.plate}
                        </Link>
                        <CopyButton text={action.plate} label={t('field.plate')} />
                      </>
                    )}
                    {action.plateInferred && (
                      <span
                        title={t('result.plateInferredHint')}
                        className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
                      >
                        {t('result.plateInferred')}
                      </span>
                    )}
                  </span>
                </div>

                {showVehicle && vehicleLabel && (
                  <div className="mt-0.5 text-sm font-medium">
                    {vehicleLabel} {action.makeYear ? `(${action.makeYear})` : ''}
                  </div>
                )}

                {showVehicle && action.vin && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm">
                    <Link
                      viewTransition
                      to={`/${action.vin}`}
                      className="font-mono text-[var(--color-primary)] underline"
                    >
                      {action.vin}
                    </Link>
                    <span className="text-[var(--color-muted)]">({t('field.vin')})</span>
                    <CopyButton text={action.vin} label={t('field.vin')} />
                  </div>
                )}

                <div className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {region}
                  {action.dep && (
                    <>
                      {' · '}
                      <a
                        href={depMapsUrl(action.dep)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--color-primary)]"
                      >
                        <span className="underline">{action.dep}</span>
                        <span aria-hidden>↗</span>
                        <span className="sr-only">{t('field.opensNewTab')}</span>
                      </a>
                    </>
                  )}
                </div>

                {(action.operName || action.operCode != null) && (
                  <div className={cn('mt-1 text-sm text-[var(--color-muted)]', category === 'noise' && 'opacity-60')}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                          CATEGORY_STYLES[category].badge
                        )}
                      >
                        {t(`oper.cat.${category}`)}
                      </span>
                      <InfoPopover label={t('oper.infoLabel')} title={t('oper.infoTitle')}>
                        <p className="m-0 font-medium">{t(`oper.catInfo.${category}`)}</p>
                        <p className="mt-2 mb-0">{t(operInfoKey(action.operCode))}</p>
                        {action.operCode != null && (
                          <p className="mt-1.5 mb-0 text-xs text-[var(--color-muted)]">
                            {t('oper.code')}: {action.operCode}
                          </p>
                        )}
                      </InfoPopover>
                    </div>

                    {action.operName && (
                      <div className={cn('mt-1 border-l-2 pl-2', CATEGORY_STYLES[category].bar)}>{action.operName}</div>
                    )}
                  </div>
                )}
              </>
            )
          }
        }),
        [...lotItems, ...wantedMarkers(wanted, t, locale).map(m => ({ at: insertIndex(actions, m.day), item: m.item }))]
      )}
    />
  )
}
