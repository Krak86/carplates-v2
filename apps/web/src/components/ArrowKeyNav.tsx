import { useEffect, type ReactNode } from 'react'

type Props = {
  /** Off while there is nothing to page through or a dialog owns the keyboard. */
  enabled: boolean
  onStep: (step: -1 | 1) => void
}

/** Left / Right arrow keys call `onStep(-1 | 1)`; ignored while typing, with a modifier held, or when another handler took the key. */
export default function ArrowKeyNav({ enabled, onStep }: Props): ReactNode {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const el = e.target instanceof HTMLElement ? e.target : null
      if (el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"]'))
        return
      e.preventDefault()
      onStep(e.key === 'ArrowLeft' ? -1 : 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onStep])
  return null
}
