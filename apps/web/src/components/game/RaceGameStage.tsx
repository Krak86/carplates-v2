import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceGameSettings from '@/components/game/RaceGameSettings'
import { useRaceGameActions } from '@/components/game/use-race-game-actions'
import { RACER_SIZE_KB, type CarBody, type RacerConfig } from '@/lib/racer/config'

type Props = {
  config: RacerConfig
  onChange: (patch: Partial<RacerConfig>) => void
  /** When set, picking a car type calls this instead of only switching the sprite (the plate-less route dresses it up). */
  onPickBody?: (body: CarBody) => void
}

/** The intro screen, then canvas + HUD + settings: everything of the game except the frame around it. */
export default function RaceGameStage({ config, onChange, onPickBody }: Props): ReactNode {
  const { t } = useTranslation()
  const [sound, setSound] = useState(false)
  const { phase, hud, wasLoaded, handleStart, handleRestart, setCanvas } = useRaceGameActions(config, sound)

  const handleToggleSound = (e: MouseEvent<HTMLButtonElement>): void => {
    setSound(on => !on)
    e.currentTarget.blur() // keys must keep steering the car
  }

  if (phase !== 'playing') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-6 text-center">
        <div className="text-5xl" aria-hidden>
          🏁
        </div>
        <p>{wasLoaded ? t('race.introReady') : t('race.intro', { size: RACER_SIZE_KB })}</p>
        <p className="text-sm text-[var(--color-muted)]">{t('race.introNote')}</p>
        {phase === 'error' && <p className="text-sm text-red-500">{t('race.error')}</p>}
        <button
          type="button"
          onClick={handleStart}
          disabled={phase === 'loading'}
          className="cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {phase === 'loading'
            ? t('race.loading')
            : wasLoaded
              ? t('race.startReady')
              : t('race.start', { size: RACER_SIZE_KB })}
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <div className="relative overflow-hidden rounded-lg bg-black">
          <canvas ref={setCanvas} className="block aspect-[4/3] w-full" />

          {hud && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3 font-mono text-white [text-shadow:0_1px_3px_#000]">
              <div>
                <div className="text-3xl leading-none font-bold">{hud.speed}</div>
                <div className="text-xs opacity-80">{t('race.hud.speed')}</div>
              </div>
              {hud.level && (
                <div className="text-center">
                  <div className="text-3xl leading-none font-bold tabular-nums">
                    {hud.level.current}/{hud.level.max}
                  </div>
                  <div className="text-xs opacity-80">{t('race.hud.level')}</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-3xl leading-none font-bold tabular-nums">{hud.km.toFixed(2)}</div>
                <div className="text-xs opacity-80">{t('race.hud.km')}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
          <span>{config.auto ? t('race.controlsAuto') : t('race.controls')}</span>
          <button
            type="button"
            onClick={handleToggleSound}
            aria-pressed={sound}
            className="ml-auto shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {sound ? t('race.soundOn') : t('race.soundOff')}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {t('race.restart')}
          </button>
        </div>
      </div>

      <RaceGameSettings config={config} onChange={onChange} onPickBody={onPickBody} />
    </div>
  )
}
