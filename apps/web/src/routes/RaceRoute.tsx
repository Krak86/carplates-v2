import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceGameChip from '@/components/game/RaceGameChip'
import RaceGameStage from '@/components/game/RaceGameStage'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  randomBackdrop,
  randomLanes,
  randomQuality,
  randomScenery,
  randomTraffic,
  type CarBody,
  type RacerConfig
} from '@/lib/racer/config'
import { randomCar, randomPreset, type CarPreset } from '@/lib/racer/presets'

/** Printed on the number plate and the billboard — there is no looked-up car here. */
const GENERIC_PLATE = 'CARS UA'

type Start = { config: RacerConfig; label: string }

function randomStart(): Start {
  const { body, preset } = randomCar()
  return {
    label: preset.label,
    config: {
      color: preset.color,
      body,
      scenery: randomScenery(),
      backdrop: randomBackdrop(),
      lanes: randomLanes(),
      traffic: randomTraffic(),
      quality: randomQuality(),
      plate: GENERIC_PLATE
    }
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
  const [start] = useState(randomStart)
  const [config, setConfig] = useState<RacerConfig>(start.config)
  const [label, setLabel] = useState<string | null>(start.label)

  const handleChange = (patch: Partial<RacerConfig>): void => {
    setConfig(c => ({ ...c, ...patch }))
    // a hand-picked colour no longer matches the example's real-world paint
    if (patch.color) setLabel(null)
  }

  const applyPreset = (body: CarBody, preset: CarPreset): void => {
    setConfig(c => ({ ...c, body, color: preset.color }))
    setLabel(preset.label)
  }

  const handlePickBody = (body: CarBody): void => applyPreset(body, randomPreset(body))

  const handleRandomCar = (): void => {
    const { body, preset } = randomCar()
    applyPreset(body, preset)
  }

  return (
    <article className="mx-auto max-w-6xl space-y-4">
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
      </Card>
    </article>
  )
}
