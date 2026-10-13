import type { MouseEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceTouchButton from '@/components/game/RaceTouchButton'
import type { RacerInput } from '@/lib/racer/engine'

type Props = {
  onInput: (input: Partial<RacerInput>) => void
  /** Only emergency vehicles have a siren; `on` says whether it is wailing. */
  siren?: { on: boolean; onToggle: MouseEventHandler<HTMLButtonElement> }
  /** Full screen: horn and siren move above the steering buttons, leaving the middle of the road clear. */
  fullscreen?: boolean
}

/** Steering on the left thumb, gas and brake on the right, horn (and siren) in the middle (above the steering in full screen), laid over the bottom of the canvas. Buttons scale with the canvas width. */
export default function RaceTouchControls({ onInput, siren, fullscreen }: Props): ReactNode {
  const { t } = useTranslation()

  const sirenButton = siren && (
    <button
      type="button"
      onClick={siren.onToggle}
      aria-pressed={siren.on}
      aria-label={t('race.siren')}
      className={`flex size-[clamp(2.75rem,13cqw,5rem)] items-center justify-center rounded-full border border-white/40 text-[clamp(1.5rem,6cqw,1.875rem)] select-none ${siren.on ? 'bg-red-600/80' : 'bg-black/40'}`}
    >
      🚨
    </button>
  )
  const hornButton = <RaceTouchButton label="📯" onHold={down => onInput({ horn: down })} />

  return (
    <div className="@container absolute inset-x-0 bottom-0 flex items-end justify-between p-3 select-none">
      <div className="flex flex-col gap-[min(0.75rem,2cqw)]">
        {fullscreen && (
          <div className="flex gap-[min(0.75rem,2cqw)]">
            {hornButton}
            {sirenButton}
          </div>
        )}
        <div className="flex gap-[min(0.75rem,2cqw)]">
          <RaceTouchButton label="←" onHold={down => onInput({ left: down })} />
          <RaceTouchButton label="→" onHold={down => onInput({ right: down })} />
        </div>
      </div>

      {!fullscreen && (
        <div className="flex gap-[min(0.75rem,2cqw)]">
          {sirenButton}
          {hornButton}
        </div>
      )}

      <div className="flex flex-col gap-[min(0.75rem,2cqw)]" aria-label={t('race.touch.pedals')}>
        <RaceTouchButton label="↑" onHold={down => onInput({ faster: down })} />
        <RaceTouchButton label="↓" onHold={down => onInput({ slower: down })} />
      </div>
    </div>
  )
}
