import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { KncapRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import InfoPopover from '@/components/InfoPopover'
import { formatStars } from '@/components/SafetyRatings.helpers'
import { cn } from '@/lib/cn'
import { kncapRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  active: boolean
}

function kncapStars(stars: number | null): string {
  return formatStars(stars != null ? String(stars) : null)
}

/** The detail page a given rating was scraped from — a real, browser-navigable URL (confirmed
 * live 2026-09-26), unlike C-NCAP which has no per-assessment permalink. */
function detailUrl(rating: KncapRating): string {
  const params = new URLSearchParams({ DETAIL_IDX: rating.assessmentId, DETAIL_YEAR: String(rating.ratingYear ?? '') })
  return `https://www.kncap.org/ncs/KncapResultDetail/initView.jsp?${params.toString()}`
}

type CategoryRowProps = { label: string; star: number | null; pct: number | null }

function CategoryRow({ label, star, pct }: CategoryRowProps): ReactNode {
  if (star == null && pct == null) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <span className="w-40 shrink-0 truncate" title={label}>
        {label}
      </span>
      {star != null && <span className="text-sm">{kncapStars(star)}</span>}
      {pct != null && <span>{pct}%</span>}
    </div>
  )
}

/** Mirrors EuroNcapRatings/JncapRatings' RatingsInfo popover — same "what do these numbers mean?" role, KNCAP's own categories. */
function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.kncapRatingsInfoClass')}</li>
      <li>{t('safety.kncapRatingsInfoCrash')}</li>
      <li>{t('safety.kncapRatingsInfoPedestrian')}</li>
      <li>{t('safety.kncapRatingsInfoAccident')}</li>
    </ul>
  )
}

type RatingCardProps = { rating: KncapRating; brand: string | null; compact: boolean }

function RatingCard({ rating, brand, compact }: RatingCardProps): ReactNode {
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
          {rating.ratingYear != null && <span>{rating.ratingYear}</span>}
          {rating.overallClass != null && (
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 font-medium text-[var(--color-primary)]">
              {t('safety.kncapClass', { n: rating.overallClass })}
            </span>
          )}
          {rating.overallScore != null && (
            <span className="font-medium text-[var(--color-foreground)]">{rating.overallScore}%</span>
          )}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-col gap-1">
            <CategoryRow label={t('safety.kncapCrash')} star={rating.crashStar} pct={rating.crashPct} />
            <CategoryRow label={t('safety.kncapPedestrian')} star={rating.pedestrianStar} pct={rating.pedestrianPct} />
            <CategoryRow label={t('safety.kncapAccident')} star={rating.accidentStar} pct={rating.accidentPct} />
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <a
            href={detailUrl(rating)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('safety.kncapFullReport')} ↗
          </a>
        </div>

        <div className="mt-1.5 text-xs text-[var(--color-muted)]">
          {t('safety.kncapOriginalName')}: {rating.nameKo}
        </div>
      </div>
    </div>
  )
}

/**
 * KNCAP (Korea, MOLIT/KoROAD) crash-test ratings, keyed on brand/model — the fifth safety-
 * ratings source alongside Euro NCAP/NHTSA/JNCAP/C-NCAP, covering the Korea-domestic fleet
 * (Hyundai/Kia/Genesis/KGM EVs and models never sold outside Korea) neither of those four
 * reaches. Scraped and persisted (pnpm ingest:kncap), not fetched live — kncap.org has no
 * documented public API. Only covers 2021-current (see kncap.ts) — a car older than that has
 * no rating here even if KNCAP tested it, not a matching gap. One of the five tabs inside
 * SafetyRatings; fetched only while the section is open AND this tab is active.
 */
export default function KncapRatings({ brand, model, year, active }: Props): ReactNode {
  const { t } = useTranslation()
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...kncapRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = result.data?.ratings ?? []
  const applicableId = result.data?.applicableAssessmentId ?? null
  const applicable = ratings.find(r => r.assessmentId === applicableId) ?? null
  const others = ratings.filter(r => r.assessmentId !== applicableId)

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.kncapNone')}</p>

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.coverageKncap')}</p>
      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.kncapNone')}</p>
      )}

      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.kncapRatingsInfoLabel')}</span>
          <InfoPopover label={t('safety.kncapRatingsInfoLabel')} title={t('safety.kncapRatingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isSuccess && ratings.length > 0 && !applicable && (
        <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.kncapNoGenerationMatch')}</p>
      )}

      {applicable && <RatingCard rating={applicable} brand={brand} compact={false} />}

      {others.length > 0 && (
        <div className={cn(applicable && 'mt-1')}>
          <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">{t('safety.kncapOtherRatings')}</p>
          {others.map(r => (
            <RatingCard key={r.assessmentId} rating={r} brand={brand} compact />
          ))}
        </div>
      )}

      {ratings.length > 0 && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('safety.kncapSource')}</p>}
    </div>
  )
}
