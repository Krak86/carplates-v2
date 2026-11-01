import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  fallbackVehicleColor,
  isVin,
  normalizePlate,
  regionName,
  resolveVehicleColor,
  VEHICLE_COLOR_HEX
} from '@carplates/shared'

import { getFuelIcon, isKnownFuel } from '@/components/ResultCard.helpers'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import BrandLogo from '@/components/BrandLogo'
import ColorSwatch from '@/components/ColorSwatch'
import CopyButton from '@/components/CopyButton'
import ElectricLink from '@/components/ElectricLink'
import FieldInfoButton from '@/components/FieldInfoButton'
import FieldRow from '@/components/FieldRow'
import NoRegionBadge from '@/components/NoRegionBadge'
import RegionFlagInfo from '@/components/RegionFlagInfo'
import RegionLabel from '@/components/RegionLabel'
import SectionCount from '@/components/SectionCount'
import SectionHeader from '@/components/SectionHeader'
import Card from '@/components/ui/Card'
import UaAuctionCheck from '@/components/UaAuctionCheck'
import UaPlateBadge from '@/components/UaPlateBadge'
import WantedCheck from '@/components/WantedCheck'
import WikiHeroImage from '@/components/WikiHeroImage'
import { FUEL_TYPES, MAX_HERO_LOT_PHOTOS, TRANSMISSIONS, knownValue } from '@/components/ua-auctions/helpers'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { useCardMotion } from '@/hooks/useCardMotion'
import { cn } from '@/lib/cn'
import { auctionLotsQuery, vinQuery, wantedQuery } from '@/lib/queries'
import { useRegionLabel } from '@/lib/region-label'
import { useUiStore } from '@/store/ui-store'

const VinResult = lazy(() => import('@/components/VinResult'))

type Row = { label: string; value: ReactNode; info?: string }

type Props = {
  plate: string
  /** A standard-format plate: its badge and region are drawn (a Soviet-shaped one has neither). */
  showPlate: boolean
}

/** The registry card's pointer-tracked glow + tilt shell (its watermark logo and glow are children of the card). */
const cardMotionClass =
  'group relative isolate overflow-hidden shadow-2xl! transform-[perspective(var(--tilt-perspective,1200px))_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] transition-[transform,box-shadow] duration-200 ease-out will-change-transform backface-hidden hover:shadow-xl!'

/** First non-empty value of a field across the matched records (newest first), null when none carries it. */
const firstOf = <T,>(values: (T | null | undefined)[]): T | null => values.find(v => !!v) ?? null

/** The registry card's title block: plate badge + copy + region, under an optional logo + vehicle name. */
function CardHeader({
  plate,
  showPlate,
  brand,
  title
}: {
  plate: string
  showPlate: boolean
  brand: string | null
  title: string
}): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const plateCopy = useCopyFeedback()
  const region = regionName(plate)

  return (
    <div className="min-w-0">
      {title && (
        <div className="flex items-center gap-2 text-xl font-semibold">
          <BrandLogo brand={brand} />
          <span className="min-w-0 break-words">{title}</span>
        </div>
      )}
      {showPlate && (
        <div className="flex flex-wrap items-center text-base text-[var(--color-muted)]">
          <Link
            viewTransition
            to={`/${plate}`}
            onClick={() => plateCopy.copy(plate)}
            aria-label={plate}
            draggable={false}
            className="align-middle select-text"
          >
            <UaPlateBadge plate={plate} />
          </Link>
          <CopyButton text={plate} label={t('field.plate')} feedback={plateCopy} className="mx-1.5 align-middle" />
          {region ? (
            <>
              <RegionLabel region={region}>{regionLabel(region)}</RegionLabel>
              <span className="ml-1.5 inline-flex">
                <RegionFlagInfo region={region} label={regionLabel(region)} />
              </span>
            </>
          ) : (
            <span className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5">
              <NoRegionBadge plate={plate} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Shown under a registry 404 for a plate: when the plate is in the wanted lists or an auction lot, say so and show what
 * those sources hold, laid out like the registry card (title + plate line, then a collapsible "Basic data" list). With a
 * VIN-shaped VIN in those records the full VIN card follows (registry history of the VIN, decode, the same wanted / auction
 * sections keyed on plate AND VIN); without one the sections open by themselves so the page starts with the data visible.
 * Without a hit only the plate line is drawn. Shares its queries with the sections.
 */
export default function OtherSourcesFound({ plate, showPlate }: Props): ReactNode {
  const { t } = useTranslation()
  const [showBasic, setShowBasic] = useState(true)
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)
  const wanted = useQuery({ ...wantedQuery(plate, null) }).data
  const auctions = useQuery({ ...auctionLotsQuery(plate, null) }).data

  const records = wanted?.records ?? []
  const plates = wanted?.plates ?? []
  const lots = auctions?.lots ?? []
  const inWanted = records.length > 0 || plates.length > 0
  const inAuctions = lots.length > 0

  const vin = firstOf([...records.map(r => r.vin), ...lots.map(l => l.vin)])
  const usableVin = vin && isVin(vin) ? vin : null
  const vinCard = useQuery({ ...vinQuery(usableVin ?? ''), enabled: !!usableVin }).data

  if (!inWanted && !inAuctions) {
    return showPlate ? (
      <div className="mt-2">
        <CardHeader plate={normalizePlate(plate)} showPlate brand={null} title="" />
      </div>
    ) : null
  }

  const brand = firstOf([...records.map(r => r.brand), ...lots.map(l => l.make)])
  const model = firstOf([...records.map(r => r.model), ...lots.map(l => l.model)])
  const year = firstOf(lots.map(l => l.year))
  const color = firstOf([...records.map(r => r.color), ...lots.map(l => l.color)])
  const vehicleType = firstOf(records.map(r => r.vehicleType))
  const fuel = firstOf(lots.map(l => l.fuel))
  const knownFuel = knownValue(FUEL_TYPES, fuel)
  const engineCc = firstOf(lots.map(l => l.engineCc))
  const transmission = firstOf(lots.map(l => l.transmission))
  const knownTransmission = knownValue(TRANSMISSIONS, transmission)
  const vehicle = [brand, model].filter(Boolean).join(' ')
  // The VIN card has its own title with the vehicle; this one is for when there is no card or the decode named no make.
  const cardNamesVehicle = !!vinCard && !!extractVehicleInfo(vinCard).brand
  const title = cardNamesVehicle ? '' : [vehicle, year ? `(${year})` : ''].filter(Boolean).join(' ')
  const vehicleColor = resolveVehicleColor(color) ?? fallbackVehicleColor(plate)
  const lotPhotos = lots.flatMap(l => l.photos ?? []).slice(0, MAX_HERO_LOT_PHOTOS)
  const sources = [inWanted && t('wanted.title'), inAuctions && t('uaAuctions.title')].filter(Boolean).join(', ')

  // Registry values are upper case; the stats panel and link match on that, so the lot's own spelling is cased to it.
  const statsColor = color?.toUpperCase() ?? null
  const rows: Row[] = [
    { label: t('otherSources.type'), value: vehicleType },
    {
      label: t('field.color'),
      info: 'color',
      value: color && statsColor && (
        <span className="inline-flex items-center gap-1.5">
          <ColorSwatch value={color} />
          {color}
          <FieldInfoButton dimension="color" current={statsColor} />
          <Link
            to={`/stats?${new URLSearchParams({ dim: 'color', highlight: statsColor })}`}
            title={t('nav.stats')}
            aria-label={t('nav.stats')}
            className="rounded px-1 hover:bg-border/60"
          >
            <span aria-hidden>→</span>
          </Link>
        </span>
      )
    },
    {
      label: t('field.fuel'),
      info: 'fuel',
      value: fuel && (
        <span className="inline-flex items-center gap-1.5">
          {isKnownFuel(fuel) && <span aria-hidden>{getFuelIcon(fuel)}</span>}
          {knownFuel ? t(`uaAuctions.fuel.${knownFuel}`) : fuel}
          <FieldInfoButton dimension="fuel" current={fuel} />
          <ElectricLink brand={brand} model={model} fuel={fuel} />
        </span>
      )
    },
    {
      label: t('uaAuctions.specs.engine'),
      info: 'capacity',
      value: engineCc && `${engineCc} ${t('field.unitCc')} (~${(engineCc / 1000).toFixed(1)} ${t('field.unitL')})`
    },
    {
      label: t('uaAuctions.specs.transmission'),
      value: knownTransmission ? t(`uaAuctions.transmission.${knownTransmission}`) : transmission
    },
    { label: t('wanted.vin'), value: !vinCard && vin ? <span className="font-mono">{vin}</span> : null }
  ]
  const basicCount = rows.filter(r => !!r.value).length

  return (
    <div className="mt-3 space-y-2">
      <p
        role="status"
        className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300"
      >
        {t('otherSources.banner', { sources })}
      </p>

      {/* Same hero slot as a registry hit: the lots' own photos, then the model photo (nothing when neither exists). */}
      <WikiHeroImage
        brand={brand}
        model={model}
        year={year}
        rawKind={vehicleType}
        vehicleKey={usableVin ?? plate}
        lotPhotos={lotPhotos}
      />

      <Card ref={brand ? glowRef : undefined} className={cn(brand && cardMotionClass)}>
        {brand && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-12 -z-20 animate-glow-breathe opacity-35 blur-3xl transition-[background] duration-300 ease-out"
              style={{
                background: `radial-gradient(ellipse at var(--glow-x, 0%) var(--glow-y, 0%), ${VEHICLE_COLOR_HEX[vehicleColor]}, transparent 70%)`
              }}
            />
            <BrandLogo brand={brand} variant="watermark" />
          </>
        )}
        <CardHeader plate={normalizePlate(plate)} showPlate={showPlate} brand={brand} title={title} />

        {basicCount > 0 && (
          <>
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <SectionHeader
                icon="📋"
                title={
                  <>
                    {t('result.basicLabel')} <SectionCount count={basicCount} />
                  </>
                }
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
                  {rows.map(r => (
                    <FieldRow key={r.label} label={r.label} value={r.value} info={r.info} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <p className="text-sm text-[var(--color-muted)]">{t(vinCard ? 'otherSources.noteVin' : 'otherSources.note')}</p>

      {vinCard ? (
        <Suspense fallback={null}>
          <VinResult data={vinCard} searchedPlate={plate} />
        </Suspense>
      ) : (
        <>
          {inWanted && <WantedCheck plate={plate} vin={null} />}

          {inAuctions && <UaAuctionCheck plate={plate} vin={null} startOpen />}
        </>
      )}
    </div>
  )
}
