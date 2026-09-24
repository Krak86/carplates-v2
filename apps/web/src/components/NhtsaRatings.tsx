import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl } from '@carplates/shared'
import type { SafetyRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import CrashVideoModal from '@/components/CrashVideoModal'
import InfoPopover from '@/components/InfoPopover'
import {
  averageStarRating,
  firstPicture,
  formatAverageStars,
  formatPercent,
  formatStars
} from '@/components/SafetyRatings.helpers'
import { safetyRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  active: boolean
}

function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.ratingsInfoStars')}</li>
      <li>{t('safety.ratingsInfoOverall')}</li>
      <li>{t('safety.ratingsInfoFront')}</li>
      <li>{t('safety.ratingsInfoSide')}</li>
      <li>{t('safety.ratingsInfoAverage')}</li>
      <li>{t('safety.ratingsInfoRollover')}</li>
      <li>{t('safety.ratingsInfoSidePole')}</li>
      <li>{t('safety.ratingsInfoRolloverRisk')}</li>
      <li>{t('safety.ratingsInfoEquipment')}</li>
      <li>{t('safety.ratingsInfoCombinedSideBarrier')}</li>
      <li>{t('safety.ratingsInfoComplaints')}</li>
      <li>{t('safety.ratingsInfoInvestigations')}</li>
    </ul>
  )
}

/**
 * A make/model/year often resolves to several tested trims (body style, drivetrain)
 * with different scores — this is the "so what's the verdict" headline above that
 * per-variant detail, the way a review aggregator leads with the mean before the
 * individual reviews. Always shown, even for a single variant (where it just mirrors
 * that one row) — so "where's the average" never depends on how many trims NHTSA tested.
 */
function AverageSummary({ ratings }: { ratings: SafetyRating[] }): ReactNode {
  const { t } = useTranslation()
  const avgOverall = averageStarRating(ratings.map(r => r.overallRating))
  const avgFront = averageStarRating(ratings.map(r => r.overallFrontCrashRating))
  const avgSide = averageStarRating(ratings.map(r => r.overallSideCrashRating))
  const avgRollover = averageStarRating(ratings.map(r => r.rolloverRating))
  const avgSidePole = averageStarRating(ratings.map(r => r.sidePoleCrashRating))

  return (
    <div className="mb-2 rounded-md bg-[var(--color-primary)]/10 px-3 py-2">
      <div className="text-xs text-[var(--color-muted)]">{t('safety.average', { count: ratings.length })}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-lg leading-none">{formatAverageStars(avgOverall)}</span>
        <span className="text-sm font-medium" title={t('safety.ratingsInfoOverall')}>
          {t('safety.overall')}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--color-muted)]">
        <span title={t('safety.front')}>
          {t('safety.front')}: {formatAverageStars(avgFront)}
        </span>
        <span title={t('safety.side')}>
          {t('safety.side')}: {formatAverageStars(avgSide)}
        </span>
        <span title={t('safety.rollover')}>
          {t('safety.rollover')}: {formatAverageStars(avgRollover)}
        </span>
        <span title={t('safety.sidePole')}>
          {t('safety.sidePole')}: {formatAverageStars(avgSidePole)}
        </span>
      </div>
    </div>
  )
}

type VariantRowProps = {
  rating: SafetyRating
  brand: string | null
  onPlayVideo: (url: string, description: string) => void
}

function VariantRow({ rating, brand, onPlayVideo }: VariantRowProps): ReactNode {
  const { t } = useTranslation()
  const picture = firstPicture(rating)
  const video = rating.frontCrashVideo ?? rating.sideCrashVideo ?? rating.sidePoleVideo
  const hasLogo = Boolean(brandLogoUrl(brand))

  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      {picture ? (
        <img src={picture} alt="" className="h-16 w-16 shrink-0 rounded object-cover" loading="lazy" />
      ) : hasLogo ? (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--color-border)]/40 p-3">
          <BrandLogo brand={brand} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--color-border)]/40 text-center text-[10px] text-[var(--color-muted)]"
          aria-label={t('safety.noPicture')}
        >
          {t('safety.noPicture')}
        </div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate font-medium">{rating.description}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[var(--color-muted)]">
          <span title={t('safety.overall')}>
            {t('safety.overall')}: <span className="text-base">{formatStars(rating.overallRating)}</span>
          </span>
          <span title={t('safety.front')}>
            {t('safety.front')}: {formatStars(rating.overallFrontCrashRating)}
          </span>
          <span title={t('safety.side')}>
            {t('safety.side')}: {formatStars(rating.overallSideCrashRating)}
          </span>
          <span title={t('safety.rollover')}>
            {t('safety.rollover')}: {formatStars(rating.rolloverRating)}
          </span>
          <span title={t('safety.sidePole')}>
            {t('safety.sidePole')}: {formatStars(rating.sidePoleCrashRating)}
          </span>
        </div>

        {(formatPercent(rating.rolloverPossibility) != null || rating.dynamicTipResult != null) && (
          <div className="mt-0.5 text-xs text-[var(--color-muted)]">
            {formatPercent(rating.rolloverPossibility) != null && (
              <span>
                {t('safety.rolloverRisk')}: {formatPercent(rating.rolloverPossibility)}
              </span>
            )}
            {formatPercent(rating.rolloverPossibility) != null && rating.dynamicTipResult != null && ' · '}
            {rating.dynamicTipResult != null && (
              <span>
                {t('safety.dynamicTip')}: {rating.dynamicTipResult}
              </span>
            )}
          </div>
        )}

        {(rating.electronicStabilityControl != null ||
          rating.forwardCollisionWarning != null ||
          rating.laneDepartureWarning != null) && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[var(--color-muted)]">
            {rating.electronicStabilityControl != null && (
              <span title={t('safety.escFull')}>
                {t('safety.esc')}: {rating.electronicStabilityControl}
              </span>
            )}
            {rating.forwardCollisionWarning != null && (
              <span title={t('safety.fcwFull')}>
                {t('safety.fcw')}: {rating.forwardCollisionWarning}
              </span>
            )}
            {rating.laneDepartureWarning != null && (
              <span title={t('safety.ldwFull')}>
                {t('safety.ldw')}: {rating.laneDepartureWarning}
              </span>
            )}
          </div>
        )}

        {(rating.combinedSideBarrierAndPoleRatingFront != null ||
          rating.combinedSideBarrierAndPoleRatingRear != null ||
          rating.sideBarrierRatingOverall != null) && (
          <div className="mt-0.5 text-xs text-[var(--color-muted)]">
            {t('safety.combinedSideBarrier')}: {formatStars(rating.sideBarrierRatingOverall)} (
            {formatStars(rating.combinedSideBarrierAndPoleRatingFront)} /{' '}
            {formatStars(rating.combinedSideBarrierAndPoleRatingRear)})
          </div>
        )}

        {(rating.complaintsCount != null || rating.recallsCount != null || rating.investigationCount != null) && (
          <div className="mt-0.5 text-xs text-[var(--color-muted)]">
            {t('safety.complaints', { count: rating.complaintsCount ?? 0 })} ·{' '}
            {t('safety.recalls', { count: rating.recallsCount ?? 0 })}
            {rating.investigationCount != null && (
              <> · {t('safety.investigations', { count: rating.investigationCount })}</>
            )}
          </div>
        )}
        {video && (
          <div className="mt-0.5 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onPlayVideo(video, rating.description)}
              className="text-[var(--color-primary)] underline"
            >
              {t('safety.videoWatch')} ▶
            </button>
            <a href={video} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
              {t('safety.videoDownloadOriginal')} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * NHTSA 5-star crash test ratings, keyed on brand/model/year — US-market
 * vehicles only, so most EU/JDM/Soviet-era nameplates sold in Ukraine won't
 * have a match. One of the two tabs inside SafetyRatings; fetched only while
 * the section is open AND this tab is the active one.
 */
export default function NhtsaRatings({ brand, model, year, active }: Props): ReactNode {
  const { t } = useTranslation()
  const [video, setVideo] = useState<{ url: string; description: string } | null>(null)
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...safetyRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = result.data?.ratings ?? []

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.none')}</p>

  return (
    <div>
      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.ratingsInfoLabel')}</span>
          <InfoPopover label={t('safety.ratingsInfoLabel')} title={t('safety.ratingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.none')}</p>
      )}

      {ratings.length > 0 && <AverageSummary ratings={ratings} />}

      {ratings.map(rating => (
        <VariantRow
          key={rating.vehicleId}
          rating={rating}
          brand={brand}
          onPlayVideo={(url, description) => setVideo({ url, description })}
        />
      ))}

      {ratings.length > 0 && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('safety.source')}</p>}

      {video && (
        <CrashVideoModal nhtsaVideoUrl={video.url} description={video.description} onClose={() => setVideo(null)} />
      )}
    </div>
  )
}
