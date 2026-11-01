import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { isVin, normalizePlate, regionName } from '@carplates/shared'

import { extractVehicleInfo } from '@/components/VinResult.helpers'
import BrandLogo from '@/components/BrandLogo'
import ColorSwatch from '@/components/ColorSwatch'
import CopyButton from '@/components/CopyButton'
import FieldRow from '@/components/FieldRow'
import NoRegionBadge from '@/components/NoRegionBadge'
import RegionFlagInfo from '@/components/RegionFlagInfo'
import RegionLabel from '@/components/RegionLabel'
import SectionCount from '@/components/SectionCount'
import SectionHeader from '@/components/SectionHeader'
import UaAuctionCheck from '@/components/UaAuctionCheck'
import UaPlateBadge from '@/components/UaPlateBadge'
import WantedCheck from '@/components/WantedCheck'
import WikiHeroImage from '@/components/WikiHeroImage'
import { FUEL_TYPES, MAX_HERO_LOT_PHOTOS, TRANSMISSIONS, knownValue } from '@/components/ua-auctions/helpers'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionLotsQuery, vinQuery, wantedQuery } from '@/lib/queries'
import { useRegionLabel } from '@/lib/region-label'

const VinResult = lazy(() => import('@/components/VinResult'))

type Props = {
  plate: string
  /** A standard-format plate: its badge and region are drawn (a Soviet-shaped one has neither). */
  showPlate: boolean
}

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
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [showBasic, setShowBasic] = useState(true)
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
  const lotPhotos = lots.flatMap(l => l.photos ?? []).slice(0, MAX_HERO_LOT_PHOTOS)
  const sources = [inWanted && t('wanted.title'), inAuctions && t('uaAuctions.title')].filter(Boolean).join(', ')

  const rows: [string, ReactNode][] = [
    [t('otherSources.type'), vehicleType],
    [
      t('wanted.color'),
      color && (
        <span className="inline-flex items-center gap-1.5">
          <ColorSwatch value={color} />
          {color}
        </span>
      )
    ],
    [t('field.fuel'), knownFuel ? t(`uaAuctions.fuel.${knownFuel}`) : fuel],
    [t('uaAuctions.specs.engine'), engineCc && `${engineCc.toLocaleString(locale)} ${t('uaAuctions.specs.cc')}`],
    [
      t('uaAuctions.specs.transmission'),
      knownTransmission ? t(`uaAuctions.transmission.${knownTransmission}`) : transmission
    ],
    [t('wanted.vin'), !vinCard && vin && <span className="font-mono">{vin}</span>]
  ]
  const basicCount = rows.filter(([, value]) => !!value).length

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
                {rows.map(([label, value]) => (
                  <FieldRow key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

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
