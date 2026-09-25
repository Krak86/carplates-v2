import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { EuroNcapRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import InfoPopover from '@/components/InfoPopover'
import { formatStars } from '@/components/SafetyRatings.helpers'
import YouTubeModal from '@/components/YouTubeModal'
import { cn } from '@/lib/cn'
import { euroNcapRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  active: boolean
}

/** Euro NCAP ratings are only valid for 6 years from publication, then re-tested or retired. */
const RATING_VALIDITY_YEARS = 6

function euroNcapStars(stars: number | null): string {
  return formatStars(stars != null ? String(stars) : null)
}

type PillarProps = { label: string; pct: number | null }

function PillarBar({ label, pct }: PillarProps): ReactNode {
  if (pct == null) return null
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
      <span className="w-36 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]/40">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right">{pct}%</span>
    </div>
  )
}

type ImageStripProps = { images: EuroNcapRating['images'] }

function ImageStrip({ images }: ImageStripProps): ReactNode {
  const { t } = useTranslation()
  if (images.length === 0) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {images.map(img => (
          <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src={img.url}
              alt={img.test ?? ''}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-16 w-24 rounded object-cover"
            />
          </a>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-[var(--color-muted)]">{t('safety.euroncapPhotosCredit')}</p>
    </div>
  )
}

/** Mirrors NhtsaRatings' RatingsInfo popover — same "what do these numbers mean?" role, Euro NCAP's own categories. */
function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.euroncapRatingsInfoStars')}</li>
      <li>{t('safety.euroncapRatingsInfoAdultOccupant')}</li>
      <li>{t('safety.euroncapRatingsInfoChildOccupant')}</li>
      <li>{t('safety.euroncapRatingsInfoVulnerableRoadUsers')}</li>
      <li>{t('safety.euroncapRatingsInfoSafetyAssist')}</li>
      <li>{t('safety.euroncapRatingsInfoSafetyPack')}</li>
      <li>{t('safety.euroncapRatingsInfoExpiry')}</li>
    </ul>
  )
}

type RatingCardProps = {
  rating: EuroNcapRating
  brand: string | null
  compact: boolean
  onPlayVideo: (id: string, description: string) => void
}

function RatingCard({ rating, brand, compact, onPlayVideo }: RatingCardProps): ReactNode {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()
  const expired = rating.ratingYear != null && currentYear - rating.ratingYear >= RATING_VALIDITY_YEARS
  const label = rating.testedVariant ?? `${brand ?? ''}`.trim()

  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      {rating.frontImageUrl ? (
        <img
          src={rating.frontImageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--color-border)]/40 p-3">
          <BrandLogo brand={brand} className="h-full w-full object-contain" />
        </div>
      )}

      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate font-medium">{label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[var(--color-muted)]">
          <span className="text-base">{euroNcapStars(rating.stars)}</span>
          {rating.ratingYear != null && <span>{rating.ratingYear}</span>}
          {rating.bodyType != null && <span>{rating.bodyType}</span>}
          {rating.safetyPack && (
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs">
              {t('safety.euroncapSafetyPack')}
            </span>
          )}
        </div>

        {expired && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{t('safety.euroncapExpired')}</p>}

        {!compact && (
          <div className="mt-2 flex flex-col gap-1">
            <PillarBar label={t('safety.euroncapAdultOccupant')} pct={rating.adultOccupantPct} />
            <PillarBar label={t('safety.euroncapChildOccupant')} pct={rating.childOccupantPct} />
            <PillarBar label={t('safety.euroncapVulnerableRoadUsers')} pct={rating.vulnerableRoadUsersPct} />
            <PillarBar label={t('safety.euroncapSafetyAssist')} pct={rating.safetyAssistPct} />
          </div>
        )}

        {!compact && <ImageStrip images={rating.images} />}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {rating.youtubeIds[0] && (
            <button
              type="button"
              onClick={() => onPlayVideo(rating.youtubeIds[0]!, label)}
              className="text-[var(--color-primary)] underline"
            >
              {t('safety.euroncapWatchVideo')} ▶
            </button>
          )}
          <a
            href={rating.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('safety.euroncapFullReport')} ↗
          </a>
          {rating.reportPdfUrl && (
            <a
              href={rating.reportPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              {t('safety.euroncapPdfReport')} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Euro NCAP crash-test ratings, keyed on brand/model — EU-spec vehicles, the
 * dominant import stock in Ukraine, unlike NHTSA's US-only coverage. Scraped
 * and persisted (pnpm ingest:euroncap), not fetched live: there's no public
 * Euro NCAP API. One of the two tabs inside SafetyRatings; fetched only while
 * the section is open AND this tab is the active one.
 */
export default function EuroNcapRatings({ brand, model, year, active }: Props): ReactNode {
  const { t } = useTranslation()
  const [video, setVideo] = useState<{ id: string; description: string } | null>(null)
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...euroNcapRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = result.data?.ratings ?? []
  const applicableId = result.data?.applicableAssessmentId ?? null
  const applicable = ratings.find(r => r.assessmentId === applicableId) ?? null
  const others = ratings.filter(r => r.assessmentId !== applicableId)

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.euroncapNone')}</p>

  return (
    <div>
      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.euroncapNone')}</p>
      )}

      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.euroncapRatingsInfoLabel')}</span>
          <InfoPopover label={t('safety.euroncapRatingsInfoLabel')} title={t('safety.euroncapRatingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isSuccess && ratings.length > 0 && !applicable && (
        <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.euroncapNoGenerationMatch')}</p>
      )}

      {applicable && (
        <RatingCard
          rating={applicable}
          brand={brand}
          compact={false}
          onPlayVideo={(id, d) => setVideo({ id, description: d })}
        />
      )}

      {others.length > 0 && (
        <div className={cn(applicable && 'mt-1')}>
          <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">{t('safety.euroncapOtherRatings')}</p>
          {others.map(r => (
            <RatingCard
              key={r.assessmentId}
              rating={r}
              brand={brand}
              compact
              onPlayVideo={(id, d) => setVideo({ id, description: d })}
            />
          ))}
        </div>
      )}

      {ratings.length > 0 && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('safety.euroncapSource')}</p>}

      {video && <YouTubeModal youtubeId={video.id} description={video.description} onClose={() => setVideo(null)} />}
    </div>
  )
}
