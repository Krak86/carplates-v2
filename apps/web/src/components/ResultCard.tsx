import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  dealerUrl,
  fallbackVehicleColor,
  resolveVehicleColor,
  resolveVehicleKind,
  VEHICLE_COLOR_HEX,
  wikiUrl
} from '@carplates/shared'
import type { PlateLookupResponse } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import CardTiltToggle from '@/components/CardTiltToggle'
import FavoriteButton from '@/components/FavoriteButton'
import FieldInfoButton from '@/components/FieldInfoButton'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import { getFuelIcon } from '@/components/ResultCard.helpers'
import SafetyRatings from '@/components/SafetyRatings'
import Card from '@/components/ui/Card'
import VehicleKindIcon from '@/components/VehicleKindIcon'
import VehiclePhotos from '@/components/VehiclePhotos'
import VinDecodeFields from '@/components/VinDecodeFields'
import { useCardMotion } from '@/hooks/useCardMotion'
import { cn } from '@/lib/cn'
import { depMapsUrl } from '@/lib/maps'
import { plateHistoryQuery, vinQuery } from '@/lib/queries'
import { useUiStore } from '@/store/ui-store'

type Props = {
  data: PlateLookupResponse
}

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (value == null || value === '') return null
  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">{label}</span>
      <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right font-medium">{value}</span>
    </div>
  )
}

export default function ResultCard({ data }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [showMore, setShowMore] = useState(false)
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)
  const c = data.current
  const hasVin = c.vin != null
  const vehicleKind = resolveVehicleKind(c.kind)
  const vehicleColor = resolveVehicleColor(c.color) ?? fallbackVehicleColor(data.plate)
  const brandDealerUrl = dealerUrl(c.brand)
  const modelWikiUrl = wikiUrl(c.brand, c.model, i18n.language)

  // Plate history covers every vehicle that ever wore this plate, reassignment
  // included. A VIN's own registry rows cover every plate that vehicle ever
  // wore. Neither subsumes the other, so both run and render as separate sections.
  const plateHistory = useQuery({ ...plateHistoryQuery(data.plate), enabled: showMore })
  const vinDetail = useQuery({ ...vinQuery(c.vin ?? ''), enabled: showMore && hasVin })
  const currentVehicle = { brand: c.brand, model: c.model }

  // A pure EV has no engine capacity — power_kwt (2026+ only) is its only engine
  // figure, so it takes the capacity row's place instead of being hidden.
  const hasCapacity = c.capacity != null
  const engineLabel = hasCapacity ? t('field.capacity') : t('field.power')
  const engineValue = hasCapacity ? c.capacity : c.powerKwt

  return (
    <div className="relative w-full max-w-2xl">
      {/* Wide viewports have room beside the card — float the toggle out there instead
          of stacking it above, which otherwise pushes the card down for no reason. */}
      <CardTiltToggle className="absolute top-3 -right-14 hidden lg:inline-flex" />
      <Card
        ref={glowRef}
        className="group relative isolate w-full transform-[perspective(var(--tilt-perspective,1200px))_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] overflow-hidden shadow-2xl! transition-[transform,box-shadow] duration-200 ease-out will-change-transform backface-hidden hover:shadow-xl!"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 -z-20 animate-glow-breathe opacity-35 blur-3xl transition-[background] duration-300 ease-out"
          style={{
            background: `radial-gradient(ellipse at var(--glow-x, 0%) var(--glow-y, 0%), ${VEHICLE_COLOR_HEX[vehicleColor]}, transparent 70%)`
          }}
        />
        <BrandLogo brand={c.brand} variant="watermark" />
        <CardTiltToggle className="absolute top-3 right-12 lg:hidden" />
        <FavoriteButton
          kind="plate"
          value={data.plate}
          label={[c.brand, c.model].filter(Boolean).join(' ') || null}
          className="absolute top-3 right-3"
        />

        <div className="mb-3 flex items-stretch gap-3 pr-20 lg:pr-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xl font-semibold">
              <BrandLogo brand={c.brand} />
              <span>
                {[c.brand, c.model].filter(Boolean).join(' ')} {c.makeYear ? `(${c.makeYear})` : ''}
              </span>
              {brandDealerUrl && (
                <a
                  href={brandDealerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('result.officialSite')}
                  className="inline-flex shrink-0 items-center text-base text-[var(--color-primary)]"
                >
                  <span aria-hidden>↗</span>
                  <span className="sr-only">
                    {t('result.officialSite')} — {t('field.opensNewTab')}
                  </span>
                </a>
              )}
              {modelWikiUrl && (
                <a
                  href={modelWikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('result.wikiSite')}
                  className="inline-flex shrink-0 items-center text-base text-[var(--color-primary)]"
                >
                  <span
                    aria-hidden
                    className="inline-block h-3.5 w-3.5 bg-[var(--color-primary)]"
                    style={{
                      maskImage: 'url(/icons/wikipedia-w.svg)',
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center'
                    }}
                  />
                  <span className="sr-only">
                    {t('result.wikiSite')} — {t('field.opensNewTab')}
                  </span>
                </a>
              )}
            </div>
            <div className="text-base text-[var(--color-muted)]">
              <Link to={`/${data.plate}`} className="text-[var(--color-primary)] underline">
                {data.plate}
              </Link>
              {data.region && (
                <span className="ml-1 rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5">, {data.region}</span>
              )}
              {c.plateInferred && (
                <span
                  title={t('result.plateInferredHint')}
                  className="ml-2 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
                >
                  {t('result.plateInferred')}
                </span>
              )}
            </div>
          </div>
          <VehicleKindIcon
            kind={vehicleKind}
            color={vehicleColor}
            className="aspect-square max-h-20 shrink-0"
            title={[c.kind && `${t('field.kind')}: ${c.kind}`, c.color && `${t('field.color')}: ${c.color}`]
              .filter(Boolean)
              .join('\n')}
          />
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <Row
            label={t('field.body')}
            value={
              c.body && (
                <span className="inline-flex items-center gap-1.5">
                  {c.body}
                  <FieldInfoButton dimension="body" current={c.body} />
                </span>
              )
            }
          />
          <Row label={engineLabel} value={engineValue} />
          <Row
            label={t('field.color')}
            value={
              c.color && (
                <span className="inline-flex items-center gap-1.5">
                  {c.color}
                  <FieldInfoButton dimension="color" current={c.color} />
                </span>
              )
            }
          />
          <Row
            label={t('field.fuel')}
            value={
              c.fuel && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{getFuelIcon(c.fuel)}</span>
                  {c.fuel}
                  <FieldInfoButton dimension="fuel" current={c.fuel} />
                </span>
              )
            }
          />
          <Row label={t('field.weight')} value={c.ownWeight && `${c.ownWeight} / ${c.totalWeight ?? '—'}`} />
          <Row
            label={t('field.kind')}
            value={
              c.kind && (
                <span className="inline-flex items-center gap-1.5">
                  {c.kind}
                  <FieldInfoButton dimension="kind" current={c.kind} />
                </span>
              )
            }
          />
          <Row label={t('field.purpose')} value={c.purpose} />
          {hasCapacity && <Row label={t('field.power')} value={c.powerKwt} />}
          <Row label={t('field.owner')} value={c.person === 'P' ? t('field.ownerPrivate') : t('field.ownerCompany')} />
          <Row label={t('field.regDate')} value={c.dReg} />
          <Row
            label={t('field.dep')}
            value={
              c.dep ? (
                <a
                  href={depMapsUrl(c.dep)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-primary)]"
                >
                  <span className="underline">{c.dep}</span>
                  <span aria-hidden className="no-underline">
                    ↗
                  </span>
                  <span className="sr-only">{t('field.opensNewTab')}</span>
                </a>
              ) : null
            }
          />
          <Row label={t('field.koatuu')} value={c.regAddrKoatuu} />
          <Row
            label={t('field.vin')}
            value={
              c.vin ? (
                <Link to={`/${c.vin}`} className="inline-flex items-center gap-1 text-[var(--color-primary)]">
                  <span className="underline">{c.vin}</span>
                  <span aria-hidden className="no-underline">
                    ›
                  </span>
                </Link>
              ) : null
            }
          />
        </div>

        <div className="mt-3 flex w-full justify-end">
          <button
            type="button"
            aria-expanded={showMore}
            onClick={() => setShowMore(v => !v)}
            className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-base text-[var(--color-primary)]"
          >
            <span aria-hidden className="animate-gear-tick no-underline">
              ⚙️
            </span>
            <span className="underline group-hover:no-underline">{t('result.historyLabel')}</span>
            <span
              aria-hidden
              className={cn('inline-block no-underline transition-transform duration-200', showMore && 'rotate-180')}
            >
              ▾
            </span>
          </button>
        </div>

        <div
          aria-hidden={!showMore}
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            showMore ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
                <span aria-hidden>🕘</span>
                {t('result.historyTitle')}
              </div>
              {plateHistory.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
              {plateHistory.isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
              {plateHistory.data && (
                <RegistrationTimeline
                  actions={plateHistory.data.actions}
                  currentPlate={data.plate}
                  currentVehicle={currentVehicle}
                />
              )}

              {hasVin && (vinDetail.isPending || vinDetail.isError || vinDetail.data?.registry) && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
                    <span aria-hidden>🆔</span>
                    {t('result.historyTitleVin')}
                  </div>
                  {vinDetail.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
                  {vinDetail.isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
                  {vinDetail.data?.registry && (
                    <RegistrationTimeline
                      actions={vinDetail.data.registry.actions}
                      currentPlate={data.plate}
                      currentVehicle={currentVehicle}
                    />
                  )}
                </div>
              )}

              {hasVin && vinDetail.isSuccess && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
                    <span aria-hidden>🆔</span>
                    {t('vin.title')}
                  </div>
                  <VinDecodeFields results={vinDetail.data.results} />
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{t('vin.source')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <SafetyRatings brand={c.brand} model={c.model} year={c.makeYear} body={c.body} />
        <VehiclePhotos brand={c.brand} model={c.model} year={c.makeYear} />
      </Card>
    </div>
  )
}
