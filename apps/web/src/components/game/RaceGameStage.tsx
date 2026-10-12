import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceGameSettings from '@/components/game/RaceGameSettings'
import RaceHornButton from '@/components/game/RaceHornButton'
import RaceTouchControls from '@/components/game/RaceTouchControls'
import { useRaceGameActions } from '@/components/game/use-race-game-actions'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BUMP_LESSONS, BUMP_WARNING, RACER_SIZE_KB, SIRENS, type CarBody, type RacerConfig } from '@/lib/racer/config'

type Props = {
  config: RacerConfig
  onChange: (patch: Partial<RacerConfig>) => void
  /** When set, picking a car type calls this instead of only switching the sprite (the plate-less route dresses it up). */
  onPickBody?: (body: CarBody) => void
}

const MOUSE_IDLE_MS = 2000

/** The intro screen, then canvas + HUD + settings: everything of the game except the frame around it. */
export default function RaceGameStage({ config, onChange, onPickBody }: Props): ReactNode {
  const { t } = useTranslation()
  const [sound, setSound] = useState(false)
  // the body whose siren is on: switching to another car silences it, and it stays off if the viewer comes back
  const [sirenBody, setSirenBody] = useState<CarBody | null>(null)
  const hasSiren = !!SIRENS[config.body]
  const siren = sirenBody === config.body
  const { phase, hud, wasLoaded, handleStart, handleRestart, handleInput, setCanvas } = useRaceGameActions(
    config,
    sound,
    siren
  )
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isPortrait = useMediaQuery('(orientation: portrait)')

  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const [nativeFullscreen, setFullscreen] = useState(false)
  // iPhone Safari has no element full screen: the frame is stretched over the page instead
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const fullscreen = nativeFullscreen || pseudoFullscreen
  const [mouseIdle, setMouseIdle] = useState(false)
  const [mouseTick, setMouseTick] = useState(0)

  useEffect(() => {
    const handleChange = (): void => setFullscreen(document.fullscreenElement === frame && !!frame)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [frame])

  const handleMouseMove = (): void => {
    setMouseIdle(false)
    setMouseTick(n => n + 1)
  }

  const handleToggleSound = (e: MouseEvent<HTMLButtonElement>): void => {
    setSound(on => !on)
    e.currentTarget.blur() // keys must keep steering the car
  }

  const handleToggleSiren = (e?: MouseEvent<HTMLButtonElement>): void => {
    setSirenBody(siren ? null : config.body)
    e?.currentTarget.blur()
  }

  // E toggles the siren (H is the horn, handled by the engine)
  useEffect(() => {
    if (!hasSiren) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      setSirenBody(body => (body === config.body ? null : config.body))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasSiren, config.body])

  const toggleFullscreen = (): void => {
    if (pseudoFullscreen) setPseudoFullscreen(false)
    else if (document.fullscreenElement) void document.exitFullscreen()
    else if (document.fullscreenEnabled) void frame?.requestFullscreen().catch(() => undefined)
    else setPseudoFullscreen(true)
  }

  const handleToggleFullscreen = (e: MouseEvent<HTMLButtonElement>): void => {
    e.currentTarget.blur() // keys must keep steering the car
    toggleFullscreen()
  }

  // F toggles full screen, M the sound (the engine ignores both)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if ((e.code !== 'KeyF' && e.code !== 'KeyM') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.code === 'KeyF') toggleFullscreen()
      else setSound(on => !on)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // the pointer hides over the game after a moment of stillness and returns on movement
  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setTimeout(() => setMouseIdle(true), MOUSE_IDLE_MS)
    return () => clearTimeout(timer)
  }, [phase, mouseIdle, mouseTick])

  if (phase !== 'playing') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-6 text-center">
        <div className="text-5xl" aria-hidden>
          🏁
        </div>
        <p>{wasLoaded ? t('race.introReady') : t('race.intro', { size: RACER_SIZE_KB })}</p>
        <p className="text-sm text-[var(--color-muted)]">{t(isTouch ? 'race.introNoteTouch' : 'race.introNote')}</p>
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
        <div
          ref={setFrame}
          onMouseMove={handleMouseMove}
          className={`relative overflow-hidden bg-black ${mouseIdle ? 'cursor-none' : ''} ${pseudoFullscreen ? 'fixed inset-0 z-50 h-dvh' : 'rounded-lg'} ${isTouch ? 'touch-none select-none' : ''}`}
        >
          <canvas
            ref={setCanvas}
            className={
              pseudoFullscreen
                ? 'block h-full w-full object-contain'
                : fullscreen
                  ? 'block h-screen w-screen object-contain'
                  : 'block aspect-[4/3] w-full'
            }
          />

          {isTouch && (
            <RaceTouchControls
              onInput={handleInput}
              siren={hasSiren ? { on: siren, onToggle: handleToggleSiren } : undefined}
            />
          )}

          {pseudoFullscreen && (
            <button
              type="button"
              onClick={() => setPseudoFullscreen(false)}
              aria-label={t('race.touch.exitFullscreen')}
              className="absolute top-3 left-1/2 size-9 -translate-x-1/2 rounded-full bg-black/50 text-white"
            >
              ✕
            </button>
          )}

          {isTouch && isPortrait && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-white [text-shadow:0_1px_3px_#000]">
              {t('race.touch.rotate')}
            </div>
          )}

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
              <div className="flex gap-5 text-right">
                <div>
                  <div
                    className={`text-3xl leading-none font-bold tabular-nums ${hud.bumps >= BUMP_WARNING ? 'text-red-400' : ''}`}
                  >
                    {hud.bumps}
                  </div>
                  <div className="text-xs opacity-80">{t('race.hud.bumps')}</div>
                </div>
                <div>
                  <div className="text-3xl leading-none font-bold tabular-nums">{hud.km.toFixed(2)}</div>
                  <div className="text-xs opacity-80">{t('race.hud.km')}</div>
                </div>
              </div>
            </div>
          )}

          {hud && hud.bumps >= BUMP_WARNING && (
            <div
              role="status"
              className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-lg bg-red-600/85 px-3 py-1.5 text-center text-sm font-semibold text-white"
            >
              {hud.bumps >= BUMP_LESSONS ? t('race.bumpsLessons') : t('race.bumpsCrashTest')}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
          <span>{isTouch ? t('race.controlsTouch') : config.auto ? t('race.controlsAuto') : t('race.controls')}</span>
          {hasSiren && (
            <button
              type="button"
              onClick={handleToggleSiren}
              aria-pressed={siren}
              className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
            >
              {siren ? t('race.sirenOn') : t('race.sirenOff')}
            </button>
          )}
          <RaceHornButton onHold={down => handleInput({ horn: down })} />
          <button
            type="button"
            onClick={handleToggleSound}
            aria-pressed={sound}
            className="ml-auto shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {sound ? t('race.soundOn') : t('race.soundOff')}
          </button>
          {(document.fullscreenEnabled || isTouch) && (
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
            >
              {t('race.fullscreen')}
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {t('race.restart')}
          </button>
        </div>
      </div>

      {isTouch ? (
        <details className="rounded-lg border border-[var(--color-border)] p-3">
          <summary className="cursor-pointer font-semibold">{t('race.touch.settings')}</summary>
          <div className="mt-3">
            <RaceGameSettings config={config} onChange={onChange} onPickBody={onPickBody} />
          </div>
        </details>
      ) : (
        <RaceGameSettings config={config} onChange={onChange} onPickBody={onPickBody} />
      )}
    </div>
  )
}
