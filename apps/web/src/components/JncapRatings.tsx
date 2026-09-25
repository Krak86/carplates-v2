import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { JncapRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import InfoPopover from '@/components/InfoPopover'
import { formatStars } from '@/components/SafetyRatings.helpers'
import YouTubeModal from '@/components/YouTubeModal'
import { cn } from '@/lib/cn'
import { jncapRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  active: boolean
}

function jncapStars(stars: number | null): string {
  return formatStars(stars != null ? String(stars) : null)
}

type RankPillProps = { label: string; rank: string | null; pct: number | null }

function RankPill({ label, rank, pct }: RankPillProps): ReactNode {
  if (rank == null && pct == null) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <span className="w-40 shrink-0 truncate" title={label}>
        {label}
      </span>
      {rank != null && (
        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 font-medium text-[var(--color-primary)]">
          {rank}
        </span>
      )}
      {pct != null && <span>{pct}%</span>}
    </div>
  )
}

type TestScoresProps = { scores: JncapRating['testScores'] }

/** JNCAP's own raw label->value test breakdown — shown verbatim, its taxonomy has changed across FY2003-2025. */
function TestScores({ scores }: TestScoresProps): ReactNode {
  if (scores.length === 0) return null
  return (
    <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)] sm:grid-cols-2">
      {scores.map(s => (
        <div key={s.label} className="flex justify-between gap-2">
          <dt className="truncate" title={s.label}>
            {s.label}
          </dt>
          <dd className="shrink-0 font-medium text-[var(--color-foreground)]">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Mirrors EuroNcapRatings' RatingsInfo popover — same "what do these numbers mean?" role, JNCAP's own categories. */
function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.jncapRatingsInfoStars')}</li>
      <li>{t('safety.jncapRatingsInfoPreventive')}</li>
      <li>{t('safety.jncapRatingsInfoCollision')}</li>
      <li>{t('safety.jncapRatingsInfoEmergencyCall')}</li>
    </ul>
  )
}

type RatingCardProps = {
  rating: JncapRating
  brand: string | null
  compact: boolean
  onPlayVideo: (id: string, description: string) => void
}

function RatingCard({ rating, brand, compact, onPlayVideo }: RatingCardProps): ReactNode {
  const { t } = useTranslation()
  const label = `${brand ?? ''}`.trim()

  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      {rating.imageUrl ? (
        <img
          src={rating.imageUrl}
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
          <span className="text-base">{jncapStars(rating.stars)}</span>
          {rating.ratingYear != null && <span>{rating.ratingYear}</span>}
          {rating.overallPct != null && <span>{rating.overallPct}%</span>}
          {rating.vehicleType != null && <span>{rating.vehicleType}</span>}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-col gap-1">
            <RankPill label={t('safety.jncapPreventive')} rank={rating.preventiveRank} pct={rating.preventivePct} />
            <RankPill label={t('safety.jncapCollision')} rank={rating.collisionRank} pct={rating.collisionPct} />
            <RankPill
              label={t('safety.jncapEmergencyCall')}
              rank={rating.emergencyCallType}
              pct={rating.emergencyCallPct}
            />
          </div>
        )}

        {!compact && <TestScores scores={rating.testScores} />}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {rating.youtubeId && (
            <button
              type="button"
              onClick={() => onPlayVideo(rating.youtubeId!, label)}
              className="text-[var(--color-primary)] underline"
            >
              {t('safety.jncapWatchVideo')} ▶
            </button>
          )}
          <a
            href={rating.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('safety.jncapFullReport')} ↗
          </a>
          {rating.reportPdfUrl && (
            <a
              href={rating.reportPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              {t('safety.jncapPdfReport')} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * JNCAP (Japan, NASVA) crash-test ratings, keyed on brand/model — the third safety-ratings
 * source alongside Euro NCAP/NHTSA, covering the JDM-domestic fleet neither of those two
 * reaches (Alphard, Vellfire, Crown, Skyline, Cedric/Gloria, Elgrand... never exported).
 * Scraped and persisted (pnpm ingest:jncap), not fetched live — there's no public JNCAP API.
 * One of the three tabs inside SafetyRatings; fetched only while the section is open AND
 * this tab is the active one.
 */
export default function JncapRatings({ brand, model, year, active }: Props): ReactNode {
  const { t } = useTranslation()
  const [video, setVideo] = useState<{ id: string; description: string } | null>(null)
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...jncapRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = result.data?.ratings ?? []
  const applicableId = result.data?.applicableAssessmentId ?? null
  const applicable = ratings.find(r => r.assessmentId === applicableId) ?? null
  const others = ratings.filter(r => r.assessmentId !== applicableId)

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.jncapNone')}</p>

  return (
    <div>
      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.jncapNone')}</p>
      )}

      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.jncapRatingsInfoLabel')}</span>
          <InfoPopover label={t('safety.jncapRatingsInfoLabel')} title={t('safety.jncapRatingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isSuccess && ratings.length > 0 && !applicable && (
        <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.jncapNoGenerationMatch')}</p>
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
          <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">{t('safety.jncapOtherRatings')}</p>
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

      {ratings.length > 0 && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('safety.jncapSource')}</p>}

      {video && <YouTubeModal youtubeId={video.id} description={video.description} onClose={() => setVideo(null)} />}
    </div>
  )
}
