import type { MouseEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceTouchButton from '@/components/game/RaceTouchButton'
import type { RacerInput } from '@/lib/racer/engine'

type Props = {
  onInput: (input: Partial<RacerInput>) => void
  /** Only emergency vehicles have a siren; `on` says whether it is wailing. */
  siren?: { on: boolean; onToggle: MouseEventHandler<HTMLButtonElement> }
}

/** Steering on the left thumb, gas and brake on the right, horn (and siren) in the middle, laid over the bottom of the canvas. */
export default function RaceTouchControls({ onInput, siren }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 select-none">
      <div className="flex gap-3">
        <RaceTouchButton label="←" onHold={down => onInput({ left: down })} />
        <RaceTouchButton label="→" onHold={down => onInput({ right: down })} />
      </div>

      <div className="flex gap-3">
        {siren && (
          <button
            type="button"
            onClick={siren.onToggle}
            aria-pressed={siren.on}
            aria-label={t('race.siren')}
            className={`flex size-16 items-center justify-center rounded-full border border-white/40 text-3xl select-none sm:size-20 ${siren.on ? 'bg-red-600/80' : 'bg-black/40'}`}
          >
            🚨
          </button>
        )}
        <RaceTouchButton label="📯" onHold={down => onInput({ horn: down })} />
      </div>

      <div className="flex flex-col gap-3" aria-label={t('race.touch.pedals')}>
        <RaceTouchButton label="↑" onHold={down => onInput({ faster: down })} />
        <RaceTouchButton label="↓" onHold={down => onInput({ slower: down })} />
      </div>
    </div>
  )
}
