import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ExpandableList from '@/components/ExpandableList'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyHazardsQuery } from '@/lib/queries'
import { distanceKm, kmLabel, osmUrl, streetViewUrl } from '@/routes/road-safety/helpers'
import HazardMap from '@/routes/road-safety/HazardMap'
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
const VIEWS = ['list', 'map'] as const
type View = (typeof VIEWS)[number]
const DEFAULT_VIEW: View = 'list'
const ALL = ''
type Me = { lat: number; lon: number }

/** Hazardous road sections and crash concentration places with a region filter and map links. Lazy, like the other sections. */
export default function HazardsSection({ year, regionNames }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [kind, setKind] = useState<Kind>(DEFAULT_KIND)
  const [view, setView] = useState<View>(DEFAULT_VIEW)
  const [region, setRegion] = useState(ALL)
  const [me, setMe] = useState<Me | null>(null)
  const [geoFailed, setGeoFailed] = useState(false)
  const hazards = useQuery(roadSafetyHazardsQuery({ year, kind, region: region || undefined }))
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  if (hazards.isError) return null
  if (!hazards.data) return <SectionSkeleton />

  const distance = (h: { lat: number | null; lon: number | null }) =>
    me && h.lat !== null && h.lon !== null ? distanceKm(me, { lat: h.lat, lon: h.lon }) : null
  const rows = hazards.data.hazards.toSorted((a, b) => {
    const da = distance(a)
    const db = distance(b)
    if (me && (da !== null || db !== null)) return (da ?? Infinity) - (db ?? Infinity)
    return (b.crashes3y ?? -1) - (a.crashes3y ?? -1)
  })

  const locate = () => {
    setGeoFailed(false)
    navigator.geolocation.getCurrentPosition(
      pos => setMe({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoFailed(true),
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    )
  }

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

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SegmentedTabs values={VIEWS} value={view} onChange={setView} label={v => t(`roadSafety.hazards.view.${v}`)} />

        {typeof navigator !== 'undefined' && 'geolocation' in navigator && (
          <button
            type="button"
            onClick={me ? () => setMe(null) : locate}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-sm hover:bg-[var(--color-border)]/30"
          >
            {me ? t('roadSafety.hazards.nearMeOff') : t('roadSafety.hazards.nearMe')}
          </button>
        )}

        {geoFailed && <span className="text-xs text-[var(--color-muted)]">{t('roadSafety.hazards.nearMeFailed')}</span>}
      </div>

      {view === 'map' && <HazardMap hazards={rows} me={me} />}

      {rows.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t('roadSafety.hazards.empty')}</p>}

      {view === 'list' && (
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

              {distance(h) !== null && (
                <span className="text-xs text-[var(--color-muted)] tabular-nums">
                  {t('roadSafety.hazards.distance', { km: numberFormat.format(Math.round(distance(h) ?? 0)) })}
                </span>
              )}

              {h.lat !== null && h.lon !== null && (
                <>
                  <a
                    href={osmUrl(h.lat, h.lon)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                  >
                    {t('roadSafety.hazards.map')}
                  </a>

                  <a
                    href={streetViewUrl(h.lat, h.lon)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                  >
                    {t('roadSafety.hazards.streetView')}
                  </a>
                </>
              )}
            </li>
          ))}
        />
      )}
    </Card>
  )
}
