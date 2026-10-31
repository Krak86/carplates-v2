import { useState } from 'react'
import type { ReactNode } from 'react'
import type { RoadSafetyHazardsResponse } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { geoMercator, geoPath } from 'd3-geo'
import { useTranslation } from 'react-i18next'

import { ukraineGeographyQuery } from '@/lib/queries'
import { kmLabel } from '@/routes/road-safety/helpers'

type Props = {
  hazards: RoadSafetyHazardsResponse['hazards']
}

const WIDTH = 800
const HEIGHT = 540

/** Hazard points (rows with plausible coordinates) over the region outlines; hover or focus a point for its road and km. */
export default function HazardMap({ hazards }: Props): ReactNode {
  const { t } = useTranslation()
  const geography = useQuery(ukraineGeographyQuery())
  const [active, setActive] = useState<number | null>(null)

  if (!geography.data) return null

  const projection = geoMercator().fitSize([WIDTH, HEIGHT], geography.data)
  const path = geoPath(projection)
  const points = hazards.flatMap((h, i) => {
    if (h.lat === null || h.lon === null) return []
    const xy = projection([h.lon, h.lat])
    return xy ? [{ h, i, x: xy[0], y: xy[1] }] : []
  })
  const shown = points.find(p => p.i === active)?.h

  return (
    <div className="mb-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('roadSafety.hazards.mapLabel')}
        className="w-full"
      >
        {geography.data.features.map((f, i) => (
          <path
            key={i}
            d={path(f) ?? undefined}
            fill="var(--color-border)"
            fillOpacity={0.25}
            stroke="var(--color-border)"
            strokeWidth={0.8}
          />
        ))}

        {points.map(p => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={p.i === active ? 6 : 3.5}
            fill="var(--color-primary)"
            fillOpacity={0.7}
            stroke="var(--color-bg)"
            strokeWidth={0.6}
            tabIndex={0}
            onMouseEnter={() => setActive(p.i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.i)}
            onBlur={() => setActive(null)}
          >
            <title>{p.h.roadCode || p.h.roadName}</title>
          </circle>
        ))}
      </svg>

      <p className="min-h-5 text-xs text-[var(--color-muted)]" aria-live="polite">
        {shown
          ? `${shown.roadCode || t('roadSafety.hazards.bypass')} ${shown.roadName}${shown.kmStart === null ? '' : `, km ${kmLabel(shown.kmStart)}`} (${shown.region})`
          : t('roadSafety.hazards.mapCount', { count: points.length })}
      </p>
    </div>
  )
}
