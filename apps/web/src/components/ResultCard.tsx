import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import {
  dealerUrl,
  fallbackVehicleColor,
  resolveVehicleColor,
  resolveVehicleKind,
  VEHICLE_COLOR_HEX
} from '@carplates/shared'
import type { PlateLookupResponse } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import BrandSiteChip from '@/components/BrandSiteChip'
import NewCarsLink from '@/components/NewCarsLink'
import EstimatedValueChip from '@/components/EstimatedValueChip'
import CardTiltToggle from '@/components/CardTiltToggle'
import RaceGameButton from '@/components/game/RaceGameButton'
import ColorSwatch from '@/components/ColorSwatch'
import CopyAllInfoButton from '@/components/CopyAllInfoButton'
import CopyButton from '@/components/CopyButton'
import LazySection from '@/components/LazySection'
import FieldInfoButton from '@/components/FieldInfoButton'
import NoRegionBadge from '@/components/NoRegionBadge'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import { kgToTonnes } from '@/components/RdwSpecs.helpers'
import ElectricLink from '@/components/ElectricLink'
import { getBodyInfo, getFuelIcon } from '@/components/ResultCard.helpers'
import PaidFeatureSections from '@/components/paid/PaidFeatureSections'
import VdbChips from '@/components/VdbChips'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import PlateSegments from '@/components/PlateSegments'
import UaPlateBadge from '@/components/UaPlateBadge'
import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import TopStatBadges from '@/components/TopStatBadges'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import { useChipsPending } from '@/components/use-chips-pending'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import Card from '@/components/ui/Card'
import Model3dButton from '@/components/Model3dButton'
import Model360Button from '@/components/Model360Button'
import VerificationLinks from '@/components/VerificationLinks'
import VinDecodeTabs from '@/components/vin/VinDecodeTabs'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { useCardMotion } from '@/hooks/useCardMotion'
import { cn } from '@/lib/cn'
import { koatuuRegion } from '@/lib/koatuu'
import { useRegionLabel } from '@/lib/region-label'
import { depMapsUrl } from '@/lib/maps'
import { plateHistoryQuery, vinQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'
import { formatVehicleLabel } from '@/lib/vehicle-label'
import { useUiStore } from '@/store/ui-store'

// Everything below the fold loads on demand (near the viewport, or a `?section=` share link): see LazySection.
const FavoriteButton = lazy(() => import('@/components/FavoriteButton'))
const VehicleKindIcon = lazy(() => import('@/components/VehicleKindIcon'))
const StockSection = lazy(() => import('@/components/StockSection'))
const SocialSection = lazy(() => import('@/components/SocialSection'))
const NewsSection = lazy(() => import('@/components/NewsSection'))
const NearbyServices = lazy(() => import('@/components/NearbyServices'))
const CarWikiInfo = lazy(() => import('@/components/CarWikiInfo'))
const VehiclePhotos = lazy(() => import('@/components/VehiclePhotos'))
const VideoReviews = lazy(() => import('@/components/VideoReviews'))
const ReviewLinks = lazy(() => import('@/components/ReviewLinks'))
const FuelEconomy = lazy(() => import('@/components/FuelEconomy'))
const RdwSpecs = lazy(() => import('@/components/RdwSpecs'))
const RdwRecalls = lazy(() => import('@/components/RdwRecalls'))
const OpenEv = lazy(() => import('@/components/OpenEv'))
const SafetyRatings = lazy(() => import('@/components/SafetyRatings'))

type Props = {
  data: PlateLookupResponse
}

// `info` is a `field.about.<info>` i18n key — adds a ❓ with a plain-language explanation of the field.
function Row({ label, value, info }: { label: string; value: ReactNode; info?: string }): ReactNode {
  const { t } = useTranslation()
  if (value == null || value === '') return null
  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        {info && (
          <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
            <InfoText text={t(`field.about.${info}`)} />
          </InfoPopover>
        )}
      </span>
      <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right font-medium">{value}</span>
    </div>
  )
}

export default function ResultCard({ data }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const [searchParams] = useSearchParams()
  const isSharedHistory = searchParams.get('section') === 'history'
  const [showMore, setShowMore] = useState(() => isSharedHistory)
  const isSharedVin = searchParams.get('section') === 'vin'
  const [showVin, setShowVin] = useState(() => isSharedVin)
  const isSharedBasic = searchParams.get('section') === 'basic'
  const [showBasic, setShowBasic] = useState(true)
  const basicRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const vinRef = useRef<HTMLDivElement>(null)
  const plateCopy = useCopyFeedback()
  const vinCopy = useCopyFeedback()
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)
  const c = data.current
  const hasVin = c.vin != null
  const vehicleKind = resolveVehicleKind(c.kind)
  const bodyInfo = getBodyInfo(c.body)
  const vehicleColor = resolveVehicleColor(c.color) ?? fallbackVehicleColor(data.plate)
  const brandDealerUrl = dealerUrl(c.brand)
  const chipsPending = useChipsPending({ brand: c.brand, model: c.model, kind: c.kind })
  useCarHeroImageActions({ brand: c.brand, model: c.model, year: c.makeYear, key: c.vin || data.plate })

  // Plate history covers every vehicle that ever wore this plate, reassignment
  // included. A VIN's own registry rows cover every plate that vehicle ever
  // wore. Neither subsumes the other, so both run and render as separate sections.
  const plateHistory = useQuery({ ...plateHistoryQuery(data.plate), enabled: showMore })
  const vinDetail = useQuery({ ...vinQuery(c.vin ?? ''), enabled: (showMore || showVin) && hasVin })
  const currentVehicle = { brand: c.brand, model: c.model }

  // A pure EV has no engine capacity — power_kwt (2026+ only) is its only engine
  // figure, so it takes the capacity row's place instead of being hidden.
  const hasCapacity = c.capacity != null
  const engineLabel = hasCapacity ? t('field.capacityName') : t('field.power')
  // Capacity reads best as "1591 cc (~1.6 L)" — the unit sits with the value, like the weight row.
  const engineValue = hasCapacity
    ? `${c.capacity} ${t('field.unitCc')} (~${(c.capacity! / 1000).toFixed(1)} ${t('field.unitL')})`
    : c.powerKwt

  useEffect(() => {
    if (isSharedHistory && historyRef.current) scrollElementIntoView(historyRef.current)
  }, [isSharedHistory])

  useEffect(() => {
    if (isSharedVin && vinRef.current) scrollElementIntoView(vinRef.current)
  }, [isSharedVin])

  useEffect(() => {
    if (isSharedBasic && basicRef.current) scrollElementIntoView(basicRef.current)
  }, [isSharedBasic])

  return (
    <div className="card-vt relative w-full max-w-content">
      {/* Wide viewports have room beside the card — float the toggle out there instead
          of stacking it above, which otherwise pushes the card down for no reason. */}
      <CardTiltToggle className="absolute top-0 -left-14 hidden lg:inline-flex" />
      <RaceGameButton
        color={VEHICLE_COLOR_HEX[vehicleColor]}
        kind={vehicleKind}
        bodyText={c.body}
        plate={data.plate}
        brand={c.brand}
        vehicleLabel={[[c.brand, c.model].filter(Boolean).join(' '), c.makeYear ? `(${c.makeYear})` : '', data.plate]
          .filter(Boolean)
          .join(' ')}
      />
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
        <Suspense fallback={null}>
          <FavoriteButton
            kind="plate"
            value={data.plate}
            label={formatVehicleLabel({ brand: c.brand, model: c.model, year: c.makeYear, color: c.color })}
            className="absolute top-3 right-3"
          />
        </Suspense>

        <div className="mb-1 flex items-stretch gap-3 pr-10 lg:pr-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xl font-semibold">
              <BrandLogo brand={c.brand} />
              <span>
                {[c.brand, c.model].filter(Boolean).join(' ')} {c.makeYear ? `(${c.makeYear})` : ''}
              </span>
              <CopyAllInfoButton
                vehicle={{ brand: c.brand, model: c.model, year: c.makeYear, body: c.body }}
                plate={data.plate}
                region={regionLabel(data.region)}
                current={c}
                vin={c.vin}
                vinDecodeResults={null}
                vinRegistryActions={null}
              />
            </div>
            <div className="text-base text-[var(--color-muted)]">
              <Link
                viewTransition
                to={`/${data.plate}`}
                onClick={() => plateCopy.copy(data.plate)}
                aria-label={data.plate}
                draggable={false}
                className="align-middle select-text"
              >
                <UaPlateBadge plate={data.plate} />
              </Link>
              <CopyButton
                text={data.plate}
                label={t('field.plate')}
                feedback={plateCopy}
                className="mx-1.5 align-middle"
              />
              {data.region && (
                <span className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5">{regionLabel(data.region)}</span>
              )}
              {!data.region && (
                <span className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5">
                  <NoRegionBadge plate={data.plate} />
                </span>
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
            {/* Reserves one chip-height up front so late-arriving chips never push the card down. */}
            <div className="mt-1 flex min-h-6 flex-wrap items-center gap-1.5">
              {chipsPending && <span aria-hidden className="h-6 w-24 animate-pulse rounded-full bg-border" />}
              <TopStatBadges brand={c.brand} model={c.model} color={c.color} region={data.region} kind={c.kind} />
              <VdbChips brand={c.brand} model={c.model} kind={c.kind} />
              <Model3dButton brand={c.brand} model={c.model} />
              <Model360Button brand={c.brand} model={c.model} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
              <NewCarsLink brand={c.brand} />
              {brandDealerUrl && <BrandSiteChip url={brandDealerUrl} />}
            </div>
          </div>
          <Suspense fallback={<div aria-hidden className="aspect-square max-h-20 shrink-0 max-md:hidden" />}>
            <VehicleKindIcon
              kind={vehicleKind}
              color={vehicleColor}
              className="aspect-square max-h-20 shrink-0 max-md:hidden"
              title={[c.kind && `${t('field.kind')}: ${c.kind}`, c.color && `${t('field.color')}: ${c.color}`]
                .filter(Boolean)
                .join('\n')}
            />
          </Suspense>
        </div>

        <EstimatedValueChip
          brand={c.brand}
          model={c.model}
          year={c.makeYear}
          kind={c.kind}
          fuel={c.fuel}
          capacity={c.capacity}
        />

        <PlateSegments plate={data.plate} region={data.region} />

        <VerificationLinks />

        <div ref={basicRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
          <SectionHeader
            icon="📋"
            title={t('result.basicLabel')}
            actions={<ShareButton section="basic" label={t('share.button', { section: t('result.basicLabel') })} />}
            open={showBasic}
            onToggle={() => setShowBasic(v => !v)}
            showLabel={t('result.basicShow')}
            hideLabel={t('result.basicHide')}
          />
        </div>

        <div
          aria-hidden={!showBasic}
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            showBasic ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <Row
                label={t('field.body')}
                info="body"
                value={
                  c.body && (
                    <span className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1.5">
                        {bodyInfo && (
                          <span aria-hidden title={t(bodyInfo.descriptionKey)}>
                            {bodyInfo.icon}
                          </span>
                        )}
                        {c.body}
                        <FieldInfoButton dimension="body" current={c.body} />
                      </span>
                      {bodyInfo && <span className="text-right text-xs text-muted">{t(bodyInfo.descriptionKey)}</span>}
                    </span>
                  )
                }
              />
              <Row label={engineLabel} value={engineValue} info={hasCapacity ? 'capacity' : 'power'} />
              <Row
                label={t('field.color')}
                info="color"
                value={
                  c.color && (
                    <span className="inline-flex items-center gap-1.5">
                      <ColorSwatch value={c.color} />
                      {c.color}
                      <FieldInfoButton dimension="color" current={c.color} />
                    </span>
                  )
                }
              />
              <Row
                label={t('field.fuel')}
                info="fuel"
                value={
                  c.fuel && (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden>{getFuelIcon(c.fuel)}</span>
                      {c.fuel}
                      <FieldInfoButton dimension="fuel" current={c.fuel} />
                      <ElectricLink brand={c.brand} model={c.model} fuel={c.fuel} />
                    </span>
                  )
                }
              />
              <Row
                label={t('field.weight')}
                value={
                  c.ownWeight &&
                  `${c.ownWeight} / ${c.totalWeight ?? '—'} ${t('field.unitKg')} (~${kgToTonnes(c.ownWeight)}${c.totalWeight ? ` / ${kgToTonnes(c.totalWeight)}` : ''} ${t('field.unitT')})`
                }
                info="weight"
              />
              <Row
                label={t('field.kind')}
                info="kind"
                value={
                  c.kind && (
                    <span className="inline-flex items-center gap-1.5">
                      {c.kind}
                      <FieldInfoButton dimension="kind" current={c.kind} />
                    </span>
                  )
                }
              />
              <Row label={t('field.purpose')} value={c.purpose} info="purpose" />
              {hasCapacity && <Row label={t('field.power')} value={c.powerKwt} info="power" />}
              <Row
                label={t('field.owner')}
                info="owner"
                value={c.person === 'P' ? t('field.ownerPrivate') : t('field.ownerCompany')}
              />
              <Row
                label={t('field.ownersCount')}
                info="ownersCount"
                value={t('field.ownersCountValue', { count: data.ownersCount })}
              />
              <Row label={t('field.regDate')} value={c.dReg} info="regDate" />
              <Row
                label={t('field.dep')}
                info="dep"
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
              <Row
                label={t('field.koatuu')}
                value={
                  c.regAddrKoatuu &&
                  [c.regAddrKoatuu, koatuuRegion(c.regAddrKoatuu, i18n.language)].filter(Boolean).join(' · ')
                }
                info="koatuu"
              />
              <Row
                label={t('field.vin')}
                info="vin"
                value={
                  c.vin ? (
                    <span className="inline-flex items-center gap-1">
                      <Link
                        viewTransition
                        to={`/${c.vin}`}
                        onClick={() => vinCopy.copy(c.vin ?? '')}
                        className="inline-flex items-center gap-1 text-[var(--color-primary)]"
                      >
                        <span className="underline">{c.vin}</span>
                        <span aria-hidden className="no-underline">
                          ›
                        </span>
                      </Link>
                      <CopyButton text={c.vin} label={t('field.vin')} feedback={vinCopy} />
                    </span>
                  ) : null
                }
              />
            </div>
          </div>
        </div>

        {hasVin && (
          <VinToggleSection
            ref={vinRef}
            icon="🆔"
            defaultOpen={isSharedVin}
            onOpenChange={setShowVin}
            showLabel={t('vin.show')}
            hideLabel={t('vin.hide')}
            title={t('vin.title')}
            info={<SectionInfo section="vin" title={t('vin.title')} />}
            actions={<ShareButton section="vin" label={t('share.button', { section: t('vin.title') })} />}
          >
            {vinDetail.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
            {vinDetail.isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
            {vinDetail.isSuccess && <VinDecodeTabs data={vinDetail.data} withBarcode />}
          </VinToggleSection>
        )}

        <VinToggleSection
          ref={historyRef}
          icon="⚙️"
          defaultOpen={isSharedHistory}
          onOpenChange={setShowMore}
          showLabel={t('result.historyShow')}
          hideLabel={t('result.historyHide')}
          title={t('result.historyLabel')}
          info={<SectionInfo section="history" title={t('result.historyLabel')} />}
          actions={<ShareButton section="history" label={t('share.button', { section: t('result.historyLabel') })} />}
        >
          <div className="mb-2">
            <Row
              label={t('field.ownersCount')}
              info="ownersCount"
              value={t('field.ownersCountValue', { count: data.ownersCount })}
            />
          </div>

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
        </VinToggleSection>

        <LazySection sections={['specs']}>
          <RdwSpecs
            brand={c.brand}
            model={c.model}
            year={c.makeYear}
            kind={c.kind}
            fuel={c.fuel}
            own={{ powerKw: c.powerKwt, displacementCc: c.capacity, massKg: c.ownWeight, grossMassKg: c.totalWeight }}
          />
        </LazySection>
        <LazySection sections={['recalls']}>
          <RdwRecalls brand={c.brand} model={c.model} year={c.makeYear} kind={c.kind} />
        </LazySection>
        <LazySection sections={['electric']}>
          <OpenEv brand={c.brand} model={c.model} year={c.makeYear} fuel={c.fuel} />
        </LazySection>
        <LazySection sections={['emissions']}>
          <FuelEconomy
            brand={c.brand}
            model={c.model}
            year={c.makeYear}
            fuel={c.fuel}
            capacity={c.capacity}
            kind={c.kind}
          />
        </LazySection>
        <LazySection sections={['ratings']}>
          <SafetyRatings brand={c.brand} model={c.model} year={c.makeYear} body={c.body} />
        </LazySection>
        <LazySection sections={['reviews']}>
          <ReviewLinks brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['videos']}>
          <VideoReviews brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['wiki']}>
          <CarWikiInfo brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['nearby']}>
          <NearbyServices brand={c.brand} />
        </LazySection>
        <LazySection sections={['photos']}>
          <VehiclePhotos brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['news']}>
          <NewsSection brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['social']}>
          <SocialSection brand={c.brand} model={c.model} year={c.makeYear} />
        </LazySection>
        <LazySection sections={['stock']}>
          <StockSection brand={c.brand} />
        </LazySection>
        <PaidFeatureSections hasPlate={!!data.plate} hasVin={hasVin} />
      </Card>
    </div>
  )
}
