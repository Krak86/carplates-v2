import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl } from '@carplates/shared'
import type { AlarmsResponse } from '@carplates/shared'

import { countryLabel, flagSlug } from '@/components/vin/helpers'
import { toIntlLocale } from '@/lib/intl'
import { regionBrandStatsQuery, regionFacetStatsQuery } from '@/lib/queries'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import type { AlarmMapOverlayContext } from '@/routes/alarms/AlarmMap'
import { fleetSummary, markerChips } from '@/routes/alarms/cars-helpers'
import { useChoiceParam, useRegionParam } from '@/routes/alarms/view-params'
import RegionCard from '@/routes/alarms/RegionCard'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'
import { DEFAULT_MAP_MODE, MAP_MODES } from '@/routes/stats/StatsMap.helpers'
import type { MapMode } from '@/routes/stats/StatsMap.helpers'

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

/**
 * "Cars & regions": the live alarm map (same fills) with one fleet chip per region (top brand / model, fuel, brand country,
 * electric share) and a card for the clicked region. The chips and the card read our own rollups, so they do not need the live feed.
 */
export default function CarsView({ data, isPending, isError }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [mode, setMode] = useChoiceParam<MapMode>('mode', MAP_MODES, DEFAULT_MAP_MODE)
  const [region, setRegion] = useRegionParam()
  const brands = useQuery({ ...regionBrandStatsQuery(), enabled: mode === 'brand' || region !== null })
  const facets = useQuery({ ...regionFacetStatsQuery(), enabled: mode !== 'brand' || region !== null })

  const brandsByRegion = new Map((brands.data?.regions ?? []).map(r => [r.region, r]))
  const facetsByRegion = new Map((facets.data?.regions ?? []).map(r => [r.region, r]))

  const overlay = ({ centers, zoom }: AlarmMapOverlayContext): ReactNode => {
    const chips = markerChips(
      mode,
      centers,
      { brands: brandsByRegion, facets: facetsByRegion },
      {
        fuel: fuelClass => t(`stats.map.fuel.${fuelClass}`),
        country: code => countryLabel(code, i18n.language, t)
      },
      brandLogoUrl,
      code => {
        const slug = flagSlug(code)
        return slug ? `/country-flags/${slug}.svg` : null
      },
      locale
    )
    return (
      <g pointerEvents="none" aria-hidden>
        {chips.map(chip => {
          const size = chip.size / Math.sqrt(zoom)
          return (
            <g key={chip.key} transform={`translate(${chip.x - size / 2} ${chip.y - size / 2})`}>
              <rect
                width={size}
                height={size}
                rx={size / 5}
                fill={chip.marker.color ?? 'white'}
                stroke="var(--color-border)"
                strokeWidth={0.5 / zoom}
              />
              {chip.marker.src ? (
                <image
                  href={chip.marker.src}
                  x={size * 0.1}
                  y={size * 0.1}
                  width={size * 0.8}
                  height={size * 0.8}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <text
                  x={size / 2}
                  y={size / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.26}
                  fontWeight={600}
                  fill={chip.marker.color ? 'white' : 'var(--color-fg)'}
                >
                  {chip.marker.text}
                </text>
              )}
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.cars.intro')}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--color-muted)]">{t('stats.map.mode')}</span>
        <SegmentedTabs values={MAP_MODES} value={mode} onChange={setMode} label={m => t(`stats.map.mode.${m}`)} />
      </div>

      <AlarmMapCard
        data={data}
        isPending={isPending}
        isError={isError}
        overlay={overlay}
        onSelectRegion={setRegion}
        selectedRegion={region}
      />

      {region ? (
        <RegionCard
          region={region}
          alerts={data?.regions}
          fleet={fleetSummary(brandsByRegion.get(region), facetsByRegion.get(region))}
        />
      ) : (
        <p className="mb-6 text-sm text-[var(--color-muted)]">{t('alarms.cars.pick')}</p>
      )}
    </>
  )
}
