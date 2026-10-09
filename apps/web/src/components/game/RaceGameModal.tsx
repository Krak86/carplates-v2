import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { type VehicleKind } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import RaceGameStage from '@/components/game/RaceGameStage'
import {
  bodyForKind,
  decodeRaceConfig,
  encodeRaceConfig,
  randomBackdrop,
  randomLanes,
  randomQuality,
  randomScenery,
  randomTraffic,
  type RacerConfig
} from '@/lib/racer/config'

type Props = {
  /** `#rrggbb` of the looked-up car — the starting paint. */
  color: string
  kind: VehicleKind | null
  /** The registry's free-text body type — picks the starting car (a fire engine for a ПОЖЕЖНИЙ, …). */
  bodyText?: string | null
  plate: string
  vehicleLabel?: string
  /** Settings token of a shared link (`?section=race&tab=…`), applied over the defaults. */
  shared: string | null
  onClose: () => void
}

/**
 * "Test your car" — a pseudo-3D racer in a modal. Desktop only, online only, outside the PWA precache: the intro
 * screen says what will be downloaded, and the engine chunk is only requested after the viewer confirms. Portal for
 * the same reason as Model3dModal: the Card's 3D tilt would otherwise become the `position: fixed` containing block.
 */
export default function RaceGameModal({
  color,
  kind,
  bodyText,
  plate,
  vehicleLabel,
  shared,
  onClose
}: Props): ReactNode {
  const { t } = useTranslation()
  const [config, setConfig] = useState<RacerConfig>(() => ({
    color,
    body: bodyForKind(kind, bodyText),
    scenery: randomScenery(),
    backdrop: randomBackdrop(),
    lanes: randomLanes(),
    traffic: randomTraffic(),
    quality: randomQuality(),
    plate,
    ...decodeRaceConfig(shared)
  }))

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange = (patch: Partial<RacerConfig>): void => setConfig(c => ({ ...c, ...patch }))

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-6xl overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-semibold">
            <span aria-hidden>🎮</span> {t('race.title')}
            {vehicleLabel && <span className="ml-2 font-normal text-[var(--color-muted)]">{vehicleLabel}</span>}
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

        <RaceGameStage config={config} onChange={handleChange} />

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
