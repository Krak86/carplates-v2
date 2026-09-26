import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { IihsRating } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import InfoPopover from '@/components/InfoPopover'
import { filterByBodyStyle, groupIihsRatings, iihsBodyBucket } from '@/components/SafetyRatings.helpers'
import type { IihsRatingGroup } from '@/components/SafetyRatings.helpers'
import { iihsRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  body: string | null
  active: boolean
}

/** The scraped detail page — a real, browser-navigable permalink, unlike C-NCAP which has none. */
function detailUrl(assessmentId: string): string {
  const path = assessmentId.split('/').map(encodeURIComponent).join('/')
  return `https://www.iihs.org/ratings/vehicle/${path}`
}

/** "2025" for a single-year group, "2023–2026" for a run of identical republished years. */
function yearLabel(group: IihsRatingGroup): string {
  return group.yearFrom === group.yearTo ? String(group.yearFrom) : `${group.yearFrom}–${group.yearTo}`
}

type TestRowProps = { test: IihsRating['tests'][number] }

function TestRow({ test }: TestRowProps): ReactNode {
  if (test.rating == null) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <span className="w-48 shrink-0 truncate" title={test.label}>
        {test.label}
      </span>
      <span className="font-medium text-[var(--color-foreground)]">{test.rating}</span>
      {test.qualifier && <span>({test.qualifier})</span>}
    </div>
  )
}

/** Mirrors KncapRatings/CncapRatings' RatingsInfo popover — same "what do these numbers mean?" role. */
function RatingsInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1.5">
      <li>{t('safety.iihsRatingsInfoScale')}</li>
      <li>{t('safety.iihsRatingsInfoFcp')}</li>
      <li>{t('safety.iihsRatingsInfoAward')}</li>
    </ul>
  )
}

type RatingCardProps = { group: IihsRatingGroup; brand: string | null }

function RatingCard({ group, brand }: RatingCardProps): ReactNode {
  const { t } = useTranslation()
  const label = `${brand ?? ''}`.trim()

  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] py-2 first:border-t-0">
      {group.imageUrl ? (
        <img
          src={group.imageUrl}
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
          <span>{yearLabel(group)}</span>
          <span>{group.variantType}</span>
          {group.award && (
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 font-medium text-[var(--color-primary)]">
              {group.award === 'TSP+' ? t('safety.iihsAwardTspPlus') : t('safety.iihsAwardTsp')}
            </span>
          )}
        </div>

        {group.tests.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {group.tests.map(test => (
              <TestRow key={test.key} test={test} />
            ))}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <a
            href={detailUrl(group.primaryAssessmentId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('safety.iihsFullReport')} ↗
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * IIHS (US, insurance-industry-funded) crash-test ratings, keyed on brand/model — the sixth
 * safety-ratings source alongside Euro NCAP/NHTSA/JNCAP/C-NCAP/KNCAP, covering the same US-spec
 * fleet NHTSA does but on a genuinely different methodology (Good/Acceptable/Marginal/Poor
 * across small-overlap/moderate-overlap/side/headlights/crash-prevention tests, plus Top Safety
 * Pick awards) — a car can rate well on one scale and not the other. Scraped and persisted
 * (pnpm ingest:iihs), not fetched live — iihs.org has no documented public API. Unlike the other
 * five sources, IIHS rates each body variant of a model-year separately, so `body` narrows
 * `ratings` down the same way NhtsaRatings does, and the API's `applicableAssessmentIds` is
 * plural (more than one variant can be "applicable" for the same year at once). IIHS also
 * republishes an identical assessment under every model-year page a generation spans — Civic
 * sedan alone has ~30 scraped rows across 1996-2026 for just 6 genuinely distinct assessments —
 * so `groupIihsRatings` collapses consecutive identical years into one card with a year range.
 * Unlike the other five sources, there's no "other tested generations" fallback list here: IIHS
 * almost always has an exact model-year match, so a list of every other generation back to the
 * 1990s would be noise, not useful fallback context (confirmed against real user feedback on a
 * real Civic plate — even grouped, the full history ran to ~18 entries). One of the six tabs
 * inside SafetyRatings; fetched only while the section is open AND this tab is active.
 */
export default function IihsRatings({ brand, model, year, body, active }: Props): ReactNode {
  const { t } = useTranslation()
  const hasQuery = Boolean(brand && model && year)
  const result = useQuery({ ...iihsRatingsQuery(brand ?? '', model ?? '', year ?? 0), enabled: active && hasQuery })
  const ratings = filterByBodyStyle(result.data?.ratings ?? [], body, r => iihsBodyBucket(r.variantType))
  const applicableIds = result.data?.applicableAssessmentIds ?? []
  const groups = groupIihsRatings(ratings, applicableIds)
  const applicable = groups.filter(g => g.applicable).sort((a, b) => b.yearTo - a.yearTo)

  if (!hasQuery) return <p className="text-base text-[var(--color-muted)]">{t('safety.iihsNone')}</p>

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.coverageIihs')}</p>
      {result.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
      {result.isError && <p className="text-base text-[var(--color-muted)]">{t('safety.unavailable')}</p>}
      {result.isSuccess && ratings.length === 0 && (
        <p className="text-base text-[var(--color-muted)]">{t('safety.iihsNone')}</p>
      )}

      {ratings.length > 0 && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{t('safety.iihsRatingsInfoLabel')}</span>
          <InfoPopover label={t('safety.iihsRatingsInfoLabel')} title={t('safety.iihsRatingsInfoTitle')}>
            <RatingsInfo />
          </InfoPopover>
        </div>
      )}

      {result.isSuccess && ratings.length > 0 && applicable.length === 0 && (
        <p className="mb-2 text-xs text-[var(--color-muted)]">{t('safety.iihsNoGenerationMatch')}</p>
      )}

      {applicable.map(g => (
        <RatingCard key={g.primaryAssessmentId} group={g} brand={brand} />
      ))}

      {ratings.length > 0 && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('safety.iihsSource')}</p>}
    </div>
  )
}
