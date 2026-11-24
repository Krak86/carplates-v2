import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceGameSettings from '@/components/game/RaceGameSettings'
import RaceControlsHelp from '@/components/game/RaceControlsHelp'
import RaceFullscreenBar from '@/components/game/RaceFullscreenBar'
import RaceHornButton from '@/components/game/RaceHornButton'
import RaceMiniMap from '@/components/game/RaceMiniMap'
import RaceProgress from '@/components/game/RaceProgress'
import RaceTouchControls from '@/components/game/RaceTouchControls'
import { useRaceGameActions } from '@/components/game/use-race-game-actions'
import { requestTiltPermission, useRaceTilt } from '@/components/game/use-race-tilt'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  BUMP_LESSONS,
  BUMP_WARNING,
  BUMP_WRECK,
  CAMERA_VIEWS,
  RACER_SIZE_KB,
  TEST_DRIVE_KM,
  SIRENS,
  driveProgress,
  encodeRaceConfig,
  type CarBody,
  type RacerConfig
} from '@/lib/racer/config'
import { buildRaceShareUrl } from '@/lib/share-section'

type Props = {
  config: RacerConfig
  onChange: (patch: Partial<RacerConfig>) => void
  /** When set, picking a car type calls this instead of only switching the sprite (the plate-less route dresses it up). */
  onPickBody?: (body: CarBody) => void
}

const MOUSE_IDLE_MS = 2000
const APP_KEYS = ['KeyF', 'KeyM', 'KeyV', 'KeyC', 'KeyR', 'KeyI', 'KeyN']

/** The intro screen, then canvas + HUD + settings: everything of the game except the frame around it. */
export default function RaceGameStage({ config, onChange, onPickBody }: Props): ReactNode {
  const { t } = useTranslation()
  const [sound, setSound] = useState(false)
  // the body whose siren is on: switching to another car silences it, and it stays off if the viewer comes back
  const [sirenBody, setSirenBody] = useState<CarBody | null>(null)
  const hasSiren = !!SIRENS[config.body]
  const siren = sirenBody === config.body
  const { phase, hud, wasLoaded, handleStart, handleRestart, handleInput, handleCamera, getMap, setCanvas } =
    useRaceGameActions(config, sound, siren)
  const [showMap, setShowMap] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const isTouch = useMediaQuery('(pointer: coarse)')
  // steering by tilting the phone: opt-in each visit, never remembered
  const [tilt, setTilt] = useState(false)
  useRaceTilt(tilt && isTouch, handleInput, handleCamera)
  const isPortrait = useMediaQuery('(orientation: portrait)')

  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const [nativeFullscreen, setFullscreen] = useState(false)
  // iPhone Safari has no element full screen: the frame is stretched over the page instead
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const fullscreen = nativeFullscreen || pseudoFullscreen
  const [mouseIdle, setMouseIdle] = useState(false)
  const [mouseTick, setMouseTick] = useState(0)

  useEffect(() => {
    const handleChange = (): void => {
      const on = document.fullscreenElement === frame && !!frame
      setFullscreen(on)
      if (!on) setTilt(false) // tilt steering lives only in full screen
    }
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

  const handleToggleMap = (e: MouseEvent<HTMLButtonElement>): void => {
    setShowMap(on => !on)
    e.currentTarget.blur() // keys must keep steering the car
  }

  const { copied, copy } = useCopyFeedback()
  // the same /race link whether the game is open from a plate or on its own page
  const handleShare = (e: MouseEvent<HTMLButtonElement>): void => {
    copy(buildRaceShareUrl(encodeRaceConfig(config)))
    e.currentTarget.blur()
  }

  /** Behind -> high -> low -> cockpit -> behind. */
  const cycleView = (): void =>
    onChange({ view: CAMERA_VIEWS[(CAMERA_VIEWS.indexOf(config.view) + 1) % CAMERA_VIEWS.length] ?? config.view })

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
    if (pseudoFullscreen) {
      setPseudoFullscreen(false)
      setTilt(false)
    } else if (document.fullscreenElement) void document.exitFullscreen()
    else if (document.fullscreenEnabled) void frame?.requestFullscreen().catch(() => undefined)
    else setPseudoFullscreen(true)
  }

  // tilt = landscape full screen + steering; leaving full screen switches it off again
  const handleToggleTilt = async (): Promise<void> => {
    if (tilt) {
      setTilt(false)
      return
    }
    const wasFullscreen = fullscreen
    const entering = wasFullscreen ? Promise.resolve() : enterFullscreen()
    const granted = await requestTiltPermission()
    await entering
    if (!granted && !wasFullscreen) {
      setPseudoFullscreen(false)
      if (document.fullscreenElement) void document.exitFullscreen()
    }
    setTilt(granted)
  }

  const enterFullscreen = async (): Promise<void> => {
    if (document.fullscreenEnabled) await frame?.requestFullscreen().catch(() => undefined)
    else setPseudoFullscreen(true)
  }

  // immersive = full screen + sound + auto drive + tilt steering in one tap; the bar at the top switches each off again
  const handleImmersive = async (): Promise<void> => {
    setSound(true)
    onChange({ auto: true })
    await handleToggleTilt()
  }

  const handleToggleFullscreen = (e: MouseEvent<HTMLButtonElement>): void => {
    e.currentTarget.blur() // keys must keep steering the car
    toggleFullscreen()
  }

  // F full screen, M sound, V camera view, C auto / manual drive, R restart, N map, I the button legend (the engine ignores them all)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (!APP_KEYS.includes(e.code) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.code === 'KeyF') toggleFullscreen()
      else if (e.code === 'KeyV') cycleView()
      else if (e.code === 'KeyC') onChange({ auto: !config.auto })
      else if (e.code === 'KeyR') handleRestart()
      else if (e.code === 'KeyI') setShowHelp(on => !on)
      else if (e.code === 'KeyN') setShowMap(on => !on)
      else setSound(on => !on)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // a crash buzzes the phone (Android; iOS has no vibration API): short for a bump, long for the wreck
  const bumps = hud?.bumps ?? 0
  const wrecked = !!hud?.wrecked
  const lastBumps = useRef(0)
  useEffect(() => {
    if (bumps > lastBumps.current) navigator.vibrate?.(wrecked ? [150, 70, 400] : 70)
    lastBumps.current = bumps
  }, [bumps, wrecked])

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
      <div className="min-w-0">
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
              fullscreen={fullscreen}
            />
          )}

          {fullscreen && (isTouch || pseudoFullscreen) && (
            <RaceFullscreenBar
              sound={{ on: sound, onToggle: () => setSound(on => !on) }}
              tilt={{ on: tilt, onToggle: () => void handleToggleTilt() }}
              auto={{ on: config.auto, onToggle: () => onChange({ auto: !config.auto }) }}
              map={{ on: showMap, onToggle: () => setShowMap(on => !on) }}
              onView={cycleView}
              help={{ on: showHelp, onToggle: () => setShowHelp(on => !on) }}
              onRestart={handleRestart}
              onExit={toggleFullscreen}
            />
          )}

          {fullscreen && showHelp && <RaceControlsHelp siren={hasSiren} />}

          {fullscreen && !showHelp && !isTouch && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/90">
              {t('race.help.hint')}
            </div>
          )}

          {isTouch && isPortrait && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-white [text-shadow:0_1px_3px_#000]">
              {t('race.touch.rotate')}
            </div>
          )}

          {showMap && (isTouch || fullscreen) && (
            <RaceMiniMap
              getMap={getMap}
              scenery={config.scenery}
              color={config.color}
              size={240}
              label={t('race.mapLabel')}
              className="pointer-events-none absolute top-20 right-3 size-28 rounded-full border-2 border-white/70 opacity-90 shadow-lg"
            />
          )}

          {hud && (isTouch || fullscreen) && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/25">
              <div className="h-full bg-[var(--color-primary)]" style={{ width: `${driveProgress(hud.km) * 100}%` }} />
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

          {hud?.wrecked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
              <div role="alertdialog" className="max-w-sm rounded-xl bg-white p-5 text-center text-black shadow-xl">
                <div className="text-5xl" aria-hidden>
                  💥🚗🔥
                </div>
                <h3 className="mt-2 text-lg font-bold">{t('race.wrecked.title')}</h3>
                <p className="mt-1 text-sm">{t('race.wrecked.text', { count: BUMP_WRECK })}</p>
                <button
                  type="button"
                  autoFocus
                  onClick={handleRestart}
                  className="mt-4 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2 font-semibold text-white"
                >
                  {t('race.wrecked.restart')}
                </button>
              </div>
            </div>
          )}

          {hud?.finished && !hud.wrecked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
              <div role="alertdialog" className="max-w-sm rounded-xl bg-white p-5 text-center text-black shadow-xl">
                <div className="text-5xl" aria-hidden>
                  🏁🤝
                </div>
                <h3 className="mt-2 text-lg font-bold">{t('race.finished.title')}</h3>
                <p className="mt-1 text-sm">{t('race.finished.text', { km: TEST_DRIVE_KM })}</p>
                <button
                  type="button"
                  autoFocus
                  onClick={handleRestart}
                  className="mt-4 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2 font-semibold text-white"
                >
                  {t('race.finished.restart')}
                </button>
              </div>
            </div>
          )}

          {hud && !hud.wrecked && !hud.finished && hud.bumps >= BUMP_WARNING && (
            <div
              role="status"
              className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-lg bg-red-600/85 px-3 py-1.5 text-center text-sm font-semibold text-white"
            >
              {hud.bumps >= BUMP_LESSONS ? t('race.bumpsLessons') : t('race.bumpsCrashTest')}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--color-muted)]">
          <span className="min-w-0 basis-full sm:basis-auto">
            {isTouch ? t('race.controlsTouch') : config.auto ? t('race.controlsAuto') : t('race.controls')}
          </span>
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
          {document.fullscreenEnabled && !isTouch && (
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
            >
              {t('race.fullscreen')}
            </button>
          )}
          {isTouch && (
            <button
              type="button"
              onClick={() => void handleImmersive()}
              title={t('race.immersiveHint')}
              className="shrink-0 cursor-pointer rounded-full bg-[var(--color-primary)] px-3 py-0.5 font-semibold text-white"
            >
              {t('race.immersive')}
            </button>
          )}
          <button
            type="button"
            onClick={e => {
              cycleView()
              e.currentTarget.blur()
            }}
            title={t('race.view')}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            <span aria-hidden>👁</span> {t(`race.view.${config.view}`)}
          </button>
          <button
            type="button"
            onClick={handleToggleMap}
            aria-pressed={showMap}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {t('race.map')}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title={t('race.shareHint')}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            <span aria-hidden>{copied ? '✅' : '🔗'}</span> {copied ? t('share.copied') : t('race.share')}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            title={t('race.restartHint')}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            {t('race.restart')}
          </button>
        </div>
        {isTouch && <p className="mt-1 text-xs text-[var(--color-muted)]">{t('race.immersiveHint')}</p>}
      </div>

      {isTouch ? (
        <details className="rounded-lg border border-[var(--color-border)] p-3">
          <summary className="cursor-pointer font-semibold">{t('race.touch.settings')}</summary>
          <div className="mt-3">
            <RaceGameSettings config={config} onChange={onChange} onPickBody={onPickBody} />
          </div>
        </details>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          {showMap && !fullscreen && (
            <RaceMiniMap
              getMap={getMap}
              scenery={config.scenery}
              color={config.color}
              size={400}
              label={t('race.mapLabel')}
              className="aspect-square w-full rounded-lg border border-[var(--color-border)]"
            />
          )}

          {hud && <RaceProgress km={hud.km} />}

          <RaceGameSettings config={config} onChange={onChange} onPickBody={onPickBody} />
        </div>
      )}
    </div>
  )
}
