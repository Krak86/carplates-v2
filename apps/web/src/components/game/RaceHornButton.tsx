import type { PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** Called with true on press and false on release (also when the pointer is lost or cancelled). */
  onHold: (down: boolean) => void
}

/** The horn under the canvas: it sounds for as long as it is held (the H key does the same). */
export default function RaceHornButton({ onHold }: Props): ReactNode {
  const { t } = useTranslation()

  const handlePress = (e: PointerEvent<HTMLButtonElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.blur() // keys must keep steering the car
    onHold(true)
  }

  const handleRelease = (): void => onHold(false)

  return (
    <button
      type="button"
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onLostPointerCapture={handleRelease}
      onContextMenu={e => e.preventDefault()}
      className="shrink-0 cursor-pointer touch-none rounded-full border border-[var(--color-border)] px-3 py-0.5 select-none hover:border-[var(--color-primary)] active:bg-[var(--color-border)]"
    >
      {t('race.horn')}
    </button>
  )
}
