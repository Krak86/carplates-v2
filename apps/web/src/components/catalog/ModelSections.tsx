import { lazy, useState } from 'react'
import type { ReactNode } from 'react'
import type { Currency } from '@carplates/shared'

import LazySection from '@/components/LazySection'

// The same lazy chunks as ResultCard's model-level sections (Vite shares them); a section that needs a plate, VIN or the
// car's own figures (history, VIN, wanted, auctions, assists) is not here. A new model-level section goes in both places.
const OriginSection = lazy(() => import('@/components/OriginSection'))
const StockSection = lazy(() => import('@/components/StockSection'))
const SocialSection = lazy(() => import('@/components/SocialSection'))
const NewsSection = lazy(() => import('@/components/NewsSection'))
const CarWikiInfo = lazy(() => import('@/components/CarWikiInfo'))
const VehiclePhotos = lazy(() => import('@/components/VehiclePhotos'))
const VideoReviews = lazy(() => import('@/components/VideoReviews'))
const ReviewLinks = lazy(() => import('@/components/ReviewLinks'))
const FuelEconomy = lazy(() => import('@/components/FuelEconomy'))
const EstimatedValueSection = lazy(() => import('@/components/EstimatedValueSection'))
const RdwSpecs = lazy(() => import('@/components/RdwSpecs'))
const RdwRecalls = lazy(() => import('@/components/RdwRecalls'))
const MotFaults = lazy(() => import('@/components/MotFaults'))
const OpenEv = lazy(() => import('@/components/OpenEv'))
const WikiSpecs = lazy(() => import('@/components/WikiSpecs'))
const SafetyRatings = lazy(() => import('@/components/SafetyRatings'))
const VehicleSizeSection = lazy(() => import('@/components/size/VehicleSizeSection'))

type Props = {
  /** Raw registry spelling (the most common one of the model): what every section looks the model up by. */
  brand: string
  model: string
  /** Typical model year of the registry cars. */
  year: number | null
  kind: string
  fuel: string | null
  capacity: number | null
  body: string | null
}

/**
 * The model-only below-the-fold sections of the card, for the catalog page (no plate, no VIN). Each is a `LazySection`:
 * crawlers never scroll, so none of these queries fire for them.
 */
export default function ModelSections({ brand, model, year, kind, fuel, capacity, body }: Props): ReactNode {
  const [valueCurrency, setValueCurrency] = useState<Currency>('EUR')

  return (
    <>
      <LazySection sections={['specs']}>
        <RdwSpecs brand={brand} model={model} year={year} kind={kind} fuel={fuel} />
      </LazySection>
      <LazySection sections={['engines']}>
        <WikiSpecs brand={brand} model={model} year={year} kind={kind} />
      </LazySection>
      <LazySection sections={['size']}>
        <VehicleSizeSection brand={brand} model={model} year={year} kind={kind} body={body} />
      </LazySection>
      <LazySection sections={['value']}>
        <EstimatedValueSection
          brand={brand}
          model={model}
          year={year}
          kind={kind}
          fuel={fuel}
          capacity={capacity}
          currency={valueCurrency}
          onCurrencyChange={setValueCurrency}
          openSignal={0}
        />
      </LazySection>
      <LazySection sections={['recalls']}>
        <RdwRecalls brand={brand} model={model} year={year} kind={kind} />
      </LazySection>
      <LazySection sections={['faults']}>
        <MotFaults brand={brand} model={model} year={year} kind={kind} fuel={fuel} />
      </LazySection>
      <LazySection sections={['electric']}>
        <OpenEv brand={brand} model={model} year={year} fuel={fuel} />
      </LazySection>
      <LazySection sections={['emissions']}>
        <FuelEconomy brand={brand} model={model} year={year} fuel={fuel} capacity={capacity} kind={kind} />
      </LazySection>
      <LazySection sections={['ratings']}>
        <SafetyRatings brand={brand} model={model} year={year} body={body} />
      </LazySection>
      <LazySection sections={['reviews']}>
        <ReviewLinks brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['videos']}>
        <VideoReviews brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['wiki']}>
        <CarWikiInfo brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['photos']}>
        <VehiclePhotos brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['news']}>
        <NewsSection brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['social']}>
        <SocialSection brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['stock']}>
        <StockSection brand={brand} model={model} year={year} />
      </LazySection>
      <LazySection sections={['origin']}>
        <OriginSection brand={brand} model={model} year={year} />
      </LazySection>
    </>
  )
}
