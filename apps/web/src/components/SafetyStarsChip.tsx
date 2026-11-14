import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ChipChevronButton from '@/components/ChipChevronButton'
import InfoPopover from '@/components/InfoPopover'
import {
  averageStarRating,
  combinedStars,
  filterByBodyStyle,
  formatStars,
  nhtsaBodyBucket,
  type StarSource
} from '@/components/SafetyRatings.helpers'
import { euroNcapRatingsQuery, jncapRatingsQuery, kncapRatingsQuery, safetyRatingsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  body: string | null
  onOpenSection: () => void
}

const SOURCE_LABEL_KEY: Record<StarSource, string> = {
  euroncap: 'safety.tabEuroNcap',
  nhtsa: 'safety.tabNhtsa',
  jncap: 'safety.tabJncap',
  kncap: 'safety.tabKncap'
}

/**
 * Combined crash-test stars for the top card: the car's own generation in every programme that publishes a 1-5
 * score (Euro NCAP, NHTSA, JNCAP, KNCAP), averaged over the ones that actually tested it. Same query keys as the
 * tabs in SafetyRatings, so the section reuses this data from cache. Loads in the background and renders nothing
 * until at least one programme returned a real (non-zero) rating.
 */
export default function SafetyStarsChip({ brand, model, year, body, onOpenSection }: Props): ReactNode {
  const { t } = useTranslation()
  const enabled = Boolean(brand && model && year)
  const [b, m, y] = [brand ?? '', model ?? '', year ?? 0]
  const euro = useQuery({ ...euroNcapRatingsQuery(b, m, y), enabled })
  const nhtsa = useQuery({ ...safetyRatingsQuery(b, m, y), enabled })
  const jncap = useQuery({ ...jncapRatingsQuery(b, m, y), enabled })
  const kncap = useQuery({ ...kncapRatingsQuery(b, m, y), enabled })

  const applicable = <R extends { assessmentId: string }>(
    data: { ratings: R[]; applicableAssessmentId: string | null } | undefined
  ): R | undefined => data?.ratings.find(r => r.assessmentId === data.applicableAssessmentId)

  const nhtsaRatings = filterByBodyStyle(nhtsa.data?.ratings ?? [], body, r => nhtsaBodyBucket(r.description))
  const result = combinedStars([
    { source: 'euroncap', stars: applicable(euro.data)?.stars ?? null },
    { source: 'nhtsa', stars: averageStarRating(nhtsaRatings.map(r => r.overallRating)) },
    { source: 'jncap', stars: applicable(jncap.data)?.stars ?? null },
    { source: 'kncap', stars: applicable(kncap.data)?.overallClass ?? null }
  ])
  if (!result) return null

  const text = result.average.toFixed(1)
  const label = t('safety.chip.label', { stars: text })

  return (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)] chip-safety">
      <span aria-hidden>⭐</span>
      {label}
      <InfoPopover label={label} title={t('safety.chip.title')}>
        <p className="mb-1">{t('safety.chip.info')}</p>
        <ul className="space-y-0.5">
          {result.sources.map(s => (
            <li key={s.source}>
              {t(SOURCE_LABEL_KEY[s.source])}:{' '}
              <span className="text-base">{formatStars(String(Math.round(s.stars)))}</span> ({s.stars.toFixed(1)})
            </li>
          ))}
        </ul>
      </InfoPopover>
      <ChipChevronButton
        label={t('safety.chip.expand')}
        onClick={onOpenSection}
        onWarm={() => void import('@/components/SafetyRatings')}
      />
    </span>
  )
}
