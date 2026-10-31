import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ExpandableList from '@/components/ExpandableList'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyHazardsQuery } from '@/lib/queries'
import { kmLabel, osmUrl } from '@/routes/road-safety/helpers'
import SectionSkeleton from '@/routes/road-safety/SectionSkeleton'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'

type Props = {
  year: number | undefined
  /** Plate region names for the filter. */
  regionNames: readonly string[]
}

const KINDS = ['hazard', 'concentration'] as const
type Kind = (typeof KINDS)[number]
const DEFAULT_KIND: Kind = 'hazard'
const ALL = ''

/** Hazardous road sections and crash concentration places with a region filter and map links. Lazy, like the other sections. */
export default function HazardsSection({ year, regionNames }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [kind, setKind] = useState<Kind>(DEFAULT_KIND)
  const [region, setRegion] = useState(ALL)
  const hazards = useQuery(roadSafetyHazardsQuery({ year, kind, region: region || undefined }))
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  if (hazards.isError) return null
  if (!hazards.data) return <SectionSkeleton />

  const rows = hazards.data.hazards.toSorted((a, b) => (b.crashes3y ?? -1) - (a.crashes3y ?? -1))

  return (
    <Card className="mb-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t('roadSafety.hazards.title')}</h2>

        <SegmentedTabs values={KINDS} value={kind} onChange={setKind} label={k => t(`roadSafety.hazards.kind.${k}`)} />
      </div>

      <p className="mb-3 text-xs text-[var(--color-muted)]">
        {t('roadSafety.hazards.note', { year: hazards.data.year })}
      </p>

      <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--color-muted)]">{t('roadSafety.hazards.region')}</span>

        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
        >
          <option value={ALL}>{t('roadSafety.hazards.allRegions')}</option>
          {regionNames.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      {rows.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t('roadSafety.hazards.empty')}</p>}

      <ExpandableList
        className="divide-y divide-[var(--color-border)]/40"
        items={rows.map((h, i) => (
          <li
            key={`${h.roadCode}-${h.kmStart}-${i}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-sm"
          >
            <span className="font-medium">{h.roadCode || t('roadSafety.hazards.bypass')}</span>

            <span className="min-w-0 flex-1 truncate text-[var(--color-muted)]" title={h.roadName}>
              {h.roadName}
            </span>

            {h.kmStart !== null && (
              <span className="tabular-nums">
                km {kmLabel(h.kmStart)}
                {h.kmEnd !== null && h.kmEnd !== h.kmStart ? ` - ${kmLabel(h.kmEnd)}` : ''}
              </span>
            )}

            {h.crashes3y !== null && (
              <span className="tabular-nums">
                {t('roadSafety.hazards.crashes3y', { count: numberFormat.format(h.crashes3y) })}
              </span>
            )}

            {!region && <span className="text-xs text-[var(--color-muted)]">{h.region}</span>}

            {h.lat !== null && h.lon !== null && (
              <a href={osmUrl(h.lat, h.lon)} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                {t('roadSafety.hazards.map')}
              </a>
            )}
          </li>
        ))}
      />
    </Card>
  )
}
