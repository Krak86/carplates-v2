import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import RaceTouchButton from '@/components/game/RaceTouchButton'
import type { RacerInput } from '@/lib/racer/engine'

type Props = {
  onInput: (input: Partial<RacerInput>) => void
}

/** Steering on the left thumb, gas and brake on the right, laid over the bottom of the canvas. */
export default function RaceTouchControls({ onInput }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 select-none">
      <div className="flex gap-3">
        <RaceTouchButton label="←" onHold={down => onInput({ left: down })} />
        <RaceTouchButton label="→" onHold={down => onInput({ right: down })} />
      </div>

      <div className="flex flex-col gap-3" aria-label={t('race.touch.pedals')}>
        <RaceTouchButton label="↑" onHold={down => onInput({ faster: down })} />
        <RaceTouchButton label="↓" onHold={down => onInput({ slower: down })} />
      </div>
    </div>
  )
}
