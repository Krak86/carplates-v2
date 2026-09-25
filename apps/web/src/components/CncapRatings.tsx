import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { CncapRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import InfoPopover from '@/components/InfoPopover'
import { cn } from '@/lib/cn'
import { cncapRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  active: boolean
}

// The source's own "all results" catalog — there's no per-assessment permalink to link out to
// (see cncap.service.ts: unlike Euro NCAP/JNCAP, one API call already returns every record).
const CNCAP_SOURCE_URL = 'https://www.c-ncap.org.cn/cncapAllData?type=cncap'

function formatScore(value: number | null, unit: CncapRating['scoreUnit'], pointsLabel: string): string | null {
  if (value == null) return null
  return unit === 'pct' ? `${value}%` : `${value} ${pointsLabel}`
}

type SubScoreRowProps = { label: string; value: number | null; unit: CncapRating['scoreUnit']; pointsLabel: string }

function SubScoreRow({ label, value, unit, pointsLabel }: SubScoreRowProps): ReactNode {
  const formatted = formatScore(value, unit, pointsLabel)
  if (formatted == null) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <span className="w-40 shrink-0 truncate" title={label}>
        {label}
      </span>
      <span>{formatted}</span>
    </div>
  )
}

/** Mirrors JncapRatings/EuroNcapRatings' RatingsInfo popover — same "what do these numbers mean?" role. */
function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.cncapRatingsInfoUnit')}</li>
      <li>{t('safety.cncapRatingsInfoOccupant')}</li>
      <li>{t('safety.cncapRatingsInfoVru')}</li>
      <li>{t('safety.cncapRatingsInfoActiveSafety')}</li>
    </ul>
  )
}

type RatingCardProps = { rating: CncapRating; brand: string | null; compact: boolean }

function RatingCard({ rating, brand, compact }: RatingCardProps): ReactNode {
  const { t } = useTranslation()
  const label = `${brand ?? ''}`.trim()
  const pointsLabel = t('safety.cncapPoints')
  const overall = formatScore(rating.overallScore, rating.scoreUnit, pointsLabel)
  const vehicleClassLabel = rating.vehicleClass ? t(`safety.cncapClass.${rating.vehicleClass}`) : null

  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--color-border)]/40 p-3">
        <BrandLogo brand={brand} className="h-full w-full object-contain" />
      </div>

      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate font-medium">{label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[var(--color-muted)]">
          {rating.ratingYear != null && <span>{rating.ratingYear}</span>}
          {overall != null && <span className="font-medium text-[var(--color-foreground)]">{overall}</span>}
          {vehicleClassLabel != null && <span>{vehicleClassLabel}</span>}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-col gap-1">
            <SubScoreRow
              label={t('safety.cncapOccupant')}
              value={rating.occupantScore}
              unit={rating.scoreUnit}
              pointsLabel={pointsLabel}
            />
            <SubScoreRow
              label={t('safety.cncapVru')}
              value={rating.vruScore}
              unit={rating.scoreUnit}
              pointsLabel={pointsLabel}
            />
            <SubScoreRow
              label={t('safety.cncapActiveSafety')}
              value={rating.activeSafetyScore}
              unit={rating.scoreUnit}
              pointsLabel={pointsLabel}
            />
          </div>
        )}

        <div className="mt-1.5 text-xs text-[var(--color-muted)]">
          {t('safety.cncapOriginalName')}: {rating.nameZh}
        </div>
      </div>
    </div>
  )
}

/**
 * C-NCAP (China, CATARC) crash-test ratings, keyed on brand/model — the fourth safety-ratings
 * source alongside Euro NCAP/NHTSA/JNCAP, covering the China-market fleet (BYD, Geely/Galaxy,
 * Chery, Zeekr, Great Wall/Haval, ...) Ukraine grey-imports in volume. Scraped and persisted
 * (pnpm ingest:cncap), not fetched live — c-ncap.org.cn has no stable public API contract to
 * rely on per-request. Unlike the other three sources, C-NCAP has no star rating (only scores),
 * and its scoring shape changed in 2018 (`scoreUnit`) — see cncap-parse.ts. One of the four
 * tabs inside SafetyRatings; fetched only while the section is open AND this tab is active.
 */
export default function CncapRatings({ brand, model, year, active }: Props): ReactNode {
  const { t } = useTranslation()
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...cncapRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = result.data?.ratings ?? []
  const applicableId = result.data?.applicableAssessmentId ?? null
  const applicable = ratings.find(r => r.assessmentId === applicableId) ?? null
  const others = ratings.filter(r => r.assessmentId !== applicableId)

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.cncapNone')}</p>

  return (
    <div>
      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.cncapNone')}</p>
      )}

      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.cncapRatingsInfoLabel')}</span>
          <InfoPopover label={t('safety.cncapRatingsInfoLabel')} title={t('safety.cncapRatingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isSuccess && ratings.length > 0 && !applicable && (
        <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.cncapNoGenerationMatch')}</p>
      )}

      {applicable && <RatingCard rating={applicable} brand={brand} compact={false} />}

      {others.length > 0 && (
        <div className={cn(applicable && 'mt-1')}>
          <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">{t('safety.cncapOtherRatings')}</p>
          {others.map(r => (
            <RatingCard key={r.assessmentId} rating={r} brand={brand} compact />
          ))}
        </div>
      )}

      {ratings.length > 0 && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {t('safety.cncapSource')}{' '}
          <a href={CNCAP_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
            c-ncap.org.cn ↗
          </a>
        </p>
      )}
    </div>
  )
}
