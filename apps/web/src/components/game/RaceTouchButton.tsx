import type { PointerEvent, ReactNode } from 'react'

type Props = {
  label: string
  /** Called with true on press and false on release (also when the finger slides off or the touch is cancelled). */
  onHold: (down: boolean) => void
}

/** One on-screen control. Pointer capture keeps the press owned by the button, so a sliding finger never leaves it stuck. */
export default function RaceTouchButton({ label, onHold }: Props): ReactNode {
  const handlePress = (e: PointerEvent<HTMLButtonElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onHold(true)
  }

  const handleRelease = (): void => onHold(false)

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onLostPointerCapture={handleRelease}
      onContextMenu={e => e.preventDefault()}
      className="flex size-16 touch-none items-center justify-center rounded-full border border-white/40 bg-black/40 text-3xl text-white select-none active:bg-white/40 sm:size-20"
    >
      {label}
    </button>
  )
}
