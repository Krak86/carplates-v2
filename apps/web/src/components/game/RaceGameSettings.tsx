import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { REGION_NAMES, VEHICLE_COLOR_HEX } from '@carplates/shared'

import RaceGameChip from '@/components/game/RaceGameChip'
import RaceGameGroup from '@/components/game/RaceGameGroup'
import RaceRegionSelect from '@/components/game/RaceRegionSelect'
import RegionFlag from '@/components/RegionFlag'
import { cn } from '@/lib/cn'
import {
  GENERIC_BACKDROPS,
  CAR_BODIES,
  LANE_OPTIONS,
  QUALITIES,
  REGION_BACKDROP_IDS,
  SCENERIES,
  TRAFFIC_LEVELS,
  randomBackdrop,
  randomRegion,
  backdropRegion,
  regionBackdrop,
  type CarBody,
  type RacerConfig,
  type SceneryId,
  type BackdropId
} from '@/lib/racer/config'

type Props = {
  config: RacerConfig
  onChange: (patch: Partial<RacerConfig>) => void
  /** Replaces the plain "switch the car type" click (the plate-less route also applies a famous example's paint). */
  onPickBody?: (body: CarBody) => void
  /** Touch devices only: steering by tilting the phone (left/right only). */
  tilt?: { on: boolean; onToggle: () => void }
}

const BODY_EMOJI: Readonly<Record<CarBody, string>> = {
  sedan: '🚗',
  hatch: '🚘',
  suv: '🚙',
  sport: '🏎️',
  pickup: '🛻',
  van: '🚐',
  moto: '🏍️',
  taxi: '🚕',
  police: '🚓',
  ambulance: '🚑',
  firetruck: '🚒',
  garbage: '🚛',
  bus: '🚌'
}

/** Region backdrops visible while the section is collapsed. */
const REGION_BACKDROPS_COLLAPSED = 3

const SCENERY_EMOJI: Readonly<Record<SceneryId, string>> = { day: '☀️', sunset: '🌇', night: '🌙', winter: '❄️' }

export default function RaceGameSettings({ config, onChange, onPickBody, tilt }: Props): ReactNode {
  const { t } = useTranslation()
  const [showAllRegions, setShowAllRegions] = useState(false)
  const regionBackdrops = showAllRegions
    ? REGION_BACKDROP_IDS
    : REGION_BACKDROP_IDS.slice(0, REGION_BACKDROPS_COLLAPSED)

  /** A region with its own photo backdrop switches to it; any other keeps the current backdrop. */
  /** A region backdrop also moves the billboards to its region; a generic one keeps the current region. */
  const handleBackdrop = (backdrop: BackdropId): void => {
    const region = backdropRegion(backdrop)
    onChange(region ? { backdrop, region } : { backdrop })
  }

  const handleRegion = (region: string): void => {
    const backdrop = regionBackdrop(region)
    onChange(backdrop ? { region, backdrop } : { region })
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <RaceGameGroup label={t('race.drive')}>
        <RaceGameChip active={config.auto} onClick={() => onChange({ auto: true })}>
          {t('race.drive.auto')}
        </RaceGameChip>
        <RaceGameChip active={!config.auto} onClick={() => onChange({ auto: false })}>
          {t('race.drive.manual')}
        </RaceGameChip>
      </RaceGameGroup>

      {tilt && (
        <RaceGameGroup label={t('race.tilt')}>
          <RaceGameChip active={tilt.on} onClick={tilt.onToggle}>
            <span aria-hidden>📱</span> {tilt.on ? t('race.tilt.on') : t('race.tilt.off')}
          </RaceGameChip>
        </RaceGameGroup>
      )}

      <RaceGameGroup label={t('race.color')}>
        {Object.values(VEHICLE_COLOR_HEX).map(hex => (
          <button
            key={hex}
            type="button"
            aria-label={hex}
            aria-pressed={config.color === hex}
            onClick={e => {
              onChange({ color: hex })
              e.currentTarget.blur()
            }}
            style={{ backgroundColor: hex }}
            className={cn(
              'size-6 cursor-pointer rounded-full border-2',
              config.color === hex ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
            )}
          />
        ))}
        <input
          type="color"
          aria-label={t('race.colorCustom')}
          title={t('race.colorCustom')}
          value={config.color}
          onChange={e => onChange({ color: e.target.value })}
          className="size-6 cursor-pointer rounded-full border border-[var(--color-border)] bg-transparent p-0"
        />
      </RaceGameGroup>

      <RaceGameGroup label={t('race.body')}>
        {CAR_BODIES.map(body => (
          <RaceGameChip
            key={body}
            active={config.body === body}
            onClick={() => (onPickBody ? onPickBody(body) : onChange({ body }))}
          >
            <span aria-hidden>{BODY_EMOJI[body]}</span> {t(`race.body.${body}`)}
          </RaceGameChip>
        ))}
      </RaceGameGroup>

      <RaceGameGroup label={t('race.backdrop')}>
        {GENERIC_BACKDROPS.map(backdrop => (
          <RaceGameChip key={backdrop} active={config.backdrop === backdrop} onClick={() => handleBackdrop(backdrop)}>
            {t(`race.backdrop.${backdrop}`)}
          </RaceGameChip>
        ))}
        <RaceGameChip active={false} onClick={() => onChange({ backdrop: randomBackdrop() })}>
          <span aria-hidden>🎲</span> {t('race.backdrop.random')}
        </RaceGameChip>
      </RaceGameGroup>

      <RaceGameGroup label={t('race.backdrop.regions')}>
        {regionBackdrops.map(backdrop => (
          <RaceGameChip key={backdrop} active={config.backdrop === backdrop} onClick={() => handleBackdrop(backdrop)}>
            <RegionFlag region={backdropRegion(backdrop)} />
            {t(`race.backdrop.${backdrop}`)}
          </RaceGameChip>
        ))}
        <RaceGameChip active={false} onClick={() => setShowAllRegions(!showAllRegions)}>
          {showAllRegions ? t('race.backdrop.regions.less') : t('race.backdrop.regions.all')}
        </RaceGameChip>
      </RaceGameGroup>

      <RaceGameGroup label={t('race.region')}>
        <RaceRegionSelect
          label={t('race.region')}
          value={config.region}
          options={REGION_NAMES}
          onChange={handleRegion}
        />
        <RaceGameChip active={false} onClick={() => handleRegion(randomRegion())}>
          <span aria-hidden>🎲</span> {t('race.region.random')}
        </RaceGameChip>
      </RaceGameGroup>

      <RaceGameGroup label={t('race.scenery')}>
        {SCENERIES.map(scenery => (
          <RaceGameChip key={scenery} active={config.scenery === scenery} onClick={() => onChange({ scenery })}>
            <span aria-hidden>{SCENERY_EMOJI[scenery]}</span> {t(`race.scenery.${scenery}`)}
          </RaceGameChip>
        ))}
      </RaceGameGroup>

      <RaceGameGroup label={t('race.lanes')}>
        {LANE_OPTIONS.map(lanes => (
          <RaceGameChip key={lanes} active={config.lanes === lanes} onClick={() => onChange({ lanes })}>
            {lanes}
          </RaceGameChip>
        ))}
      </RaceGameGroup>

      <RaceGameGroup label={t('race.traffic')}>
        {TRAFFIC_LEVELS.map(traffic => (
          <RaceGameChip key={traffic} active={config.traffic === traffic} onClick={() => onChange({ traffic })}>
            {t(`race.traffic.${traffic}`)}
          </RaceGameChip>
        ))}
      </RaceGameGroup>

      <RaceGameGroup label={t('race.quality')}>
        {QUALITIES.map(quality => (
          <RaceGameChip key={quality} active={config.quality === quality} onClick={() => onChange({ quality })}>
            {t(`race.quality.${quality}`)}
          </RaceGameChip>
        ))}
      </RaceGameGroup>
    </div>
  )
}
