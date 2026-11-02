import { useState } from 'react'
import type { RetouchStroke } from '@carplates/shared'

import { BRUSH_STEPS, DEFAULT_BRUSH_STEP, canAddStroke } from '@/components/photo-blur-editor.helpers'
import type { BlurMode } from '@/components/photo-blur-editor.helpers'

type History = { strokes: RetouchStroke[]; undone: RetouchStroke[] }

/** Editor state of the manual blur brush: mode, size and the undo / redo history of finished strokes. */
export type BlurBrush = {
  strokes: RetouchStroke[]
  mode: BlurMode
  setMode: (mode: BlurMode) => void
  radius: number
  smaller: () => void
  larger: () => void
  canSmaller: boolean
  canLarger: boolean
  commit: (stroke: RetouchStroke) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function useBlurBrush(initial: RetouchStroke[]): BlurBrush {
  const [history, setHistory] = useState<History>({ strokes: initial, undone: [] })
  const [mode, setMode] = useState<BlurMode>('add')
  const [step, setStep] = useState(DEFAULT_BRUSH_STEP)

  const { strokes, undone } = history
  const radius = BRUSH_STEPS[step] ?? BRUSH_STEPS[DEFAULT_BRUSH_STEP]

  return {
    strokes,
    mode,
    setMode,
    radius,
    smaller: () => setStep(s => Math.max(0, s - 1)),
    larger: () => setStep(s => Math.min(BRUSH_STEPS.length - 1, s + 1)),
    canSmaller: step > 0,
    canLarger: step < BRUSH_STEPS.length - 1,
    commit: (stroke: RetouchStroke) =>
      setHistory(h => (canAddStroke(h.strokes) ? { strokes: [...h.strokes, stroke], undone: [] } : h)),
    undo: () =>
      setHistory(h => {
        const last = h.strokes[h.strokes.length - 1]
        return last ? { strokes: h.strokes.slice(0, -1), undone: [...h.undone, last] } : h
      }),
    redo: () =>
      setHistory(h => {
        const last = h.undone[h.undone.length - 1]
        return last ? { strokes: [...h.strokes, last], undone: h.undone.slice(0, -1) } : h
      }),
    canUndo: strokes.length > 0,
    canRedo: undone.length > 0
  }
}
