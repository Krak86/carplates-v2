import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { type VehicleKind } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import RaceGameSettings from '@/components/game/RaceGameSettings'
import { useRaceGameActions } from '@/components/game/use-race-game-actions'
import {
  DEFAULT_LANES,
  DEFAULT_QUALITY,
  DEFAULT_TRAFFIC,
  RACER_SIZE_KB,
  bodyForKind,
  decodeRaceConfig,
  encodeRaceConfig,
  randomBackdrop,
  sceneryForHour,
  type RacerConfig
} from '@/lib/racer/config'

type Props = {
  /** `#rrggbb` of the looked-up car — the starting paint. */
  color: string
  kind: VehicleKind | null
  /** The registry's free-text body type — picks the starting car (a fire engine for a ПОЖЕЖНИЙ, …). */
  bodyText?: string | null
  plate: string
  /** Settings token of a shared link (`?section=race&tab=…`), applied over the defaults. */
  shared: string | null
  onClose: () => void
}

/**
 * "Test your car" — a pseudo-3D racer in a modal. Desktop only, online only, outside the PWA precache: the intro
 * screen says what will be downloaded, and the engine chunk is only requested after the viewer confirms. Portal for
 * the same reason as Model3dModal: the Card's 3D tilt would otherwise become the `position: fixed` containing block.
 */
export default function RaceGameModal({ color, kind, bodyText, plate, shared, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const [config, setConfig] = useState<RacerConfig>(() => ({
    color,
    body: bodyForKind(kind, bodyText),
    scenery: sceneryForHour(new Date().getHours()),
    backdrop: randomBackdrop(),
    lanes: DEFAULT_LANES,
    traffic: DEFAULT_TRAFFIC,
    quality: DEFAULT_QUALITY,
    plate,
    ...decodeRaceConfig(shared)
  }))
  const [sound, setSound] = useState(false)
  const { phase, hud, wasLoaded, handleStart, handleRestart, setCanvas } = useRaceGameActions(config, sound)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleToggleSound = (e: MouseEvent<HTMLButtonElement>): void => {
    setSound(on => !on)
    e.currentTarget.blur() // keys must keep steering the car
  }

  const handleChange = (patch: Partial<RacerConfig>): void => setConfig(c => ({ ...c, ...patch }))

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-6xl overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-semibold">
            <span aria-hidden>🎮</span> {t('race.title')}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ShareButton
              section="race"
              tab={encodeRaceConfig(config)}
              label={t('share.button', { section: t('race.shareName') })}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t('race.close')}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ✕
            </button>
          </div>
        </div>

        {phase === 'playing' ? (
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
                    <div className="text-right text-sm leading-tight">
                      <div>
                        {t('race.hud.lap')}: {hud.lap}
                      </div>
                      {hud.last && (
                        <div className={hud.record ? 'text-yellow-300' : undefined}>
                          {t('race.hud.last')}: {hud.last}
                          {hud.record ? ' 🏆' : ''}
                        </div>
                      )}
                      {hud.best && (
                        <div>
                          {t('race.hud.best')}: {hud.best}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
                <span>{t('race.controls')}</span>
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

            <RaceGameSettings config={config} onChange={handleChange} />
          </div>
        ) : (
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
        )}

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          {t('race.credit')}{' '}
          <a
            href="https://github.com/jakesgordon/javascript-racer"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            javascript-racer
          </a>{' '}
          · Jake Gordon · MIT
        </p>
      </div>
    </div>,
    document.body
  )
}
