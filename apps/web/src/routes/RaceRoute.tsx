import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import GamesNav from '@/components/game/GamesNav'
import RaceCredits from '@/components/game/RaceCredits'
import RaceGameChip from '@/components/game/RaceGameChip'
import RaceGameStage from '@/components/game/RaceGameStage'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  DEFAULT_AUTO,
  DEFAULT_VIEW,
  backdropRegion,
  decodeRaceConfig,
  randomLanes,
  randomQuality,
  randomRegion,
  randomScenery,
  randomTraffic,
  startBackdrop,
  type CarBody,
  type RacerConfig
} from '@/lib/racer/config'
import { presetBrand, randomCar, randomPreset, type CarPreset } from '@/lib/racer/presets'

/** Printed on the number plate and the billboard — there is no looked-up car here. */
const GENERIC_PLATE = 'CARS UA'

type Start = { config: RacerConfig; label: string }

function randomStart(): Start {
  const { body, preset } = randomCar()
  const region = randomRegion()
  return {
    label: preset.label,
    config: {
      color: preset.color,
      body,
      scenery: randomScenery(),
      backdrop: startBackdrop(region),
      lanes: randomLanes(),
      traffic: randomTraffic(),
      quality: randomQuality(),
      plate: GENERIC_PLATE,
      region,
      brand: presetBrand(preset),
      auto: DEFAULT_AUTO,
      view: DEFAULT_VIEW
    }
  }
}

/** A shared link (`/race?tab=<settings>`) overrides the random start with the sharer's settings. */
function sharedStart(token: string | null): Start {
  const random = randomStart()
  const shared = decodeRaceConfig(token)
  if (Object.keys(shared).length === 0) return random
  const config = { ...random.config, ...shared }
  // a region backdrop brings its own region: the billboards follow it
  const region = backdropRegion(config.backdrop)
  return {
    config: region ? { ...config, region } : config,
    // the random example's name only fits its own paint and body
    label: shared.color || shared.body ? '' : random.label
  }
}

/**
 * Standalone test drive (Phase "game route"): no plate or VIN lookup — a random famous car of a random category, with
 * every setting random as well. The car-type chips pick a hardcoded example of that category, and the HUD odometer
 * counts the kilometres of this opening of the page only. Lazy-loaded (see App.tsx).
 */
export default function RaceRoute(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [searchParams] = useSearchParams()
  const [start] = useState(() => sharedStart(searchParams.get('tab')))
  const [config, setConfig] = useState<RacerConfig>(start.config)
  const [label, setLabel] = useState<string | null>(start.label || null)

  const handleChange = (patch: Partial<RacerConfig>): void => {
    setConfig(c => ({ ...c, ...patch }))
    // a hand-picked colour no longer matches the example's real-world paint
    if (patch.color) setLabel(null)
  }

  const applyPreset = (body: CarBody, preset: CarPreset): void => {
    setConfig(c => ({ ...c, body, color: preset.color, brand: presetBrand(preset) }))
    setLabel(preset.label)
  }

  const handlePickBody = (body: CarBody): void => applyPreset(body, randomPreset(body))

  const handleRandomCar = (): void => {
    const { body, preset } = randomCar()
    applyPreset(body, preset)
  }

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <GamesNav />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          <span aria-hidden>🎮</span> {t('race.page.heading')}
        </h1>
        <div className="flex items-center gap-2 text-sm">
          {label && <span className="text-[var(--color-muted)]">{label}</span>}
          <RaceGameChip active={false} onClick={handleRandomCar}>
            <span aria-hidden>🎲</span> {t('race.page.randomCar')}
          </RaceGameChip>
        </div>
      </div>

      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-muted)]">{t('race.page.intro')}</p>
        {online ? (
          <RaceGameStage config={config} onChange={handleChange} onPickBody={handlePickBody} />
        ) : (
          <p className="py-6 text-center">{t('offline.needsConnection')}</p>
        )}
        <RaceCredits />
      </Card>
    </article>
  )
}
