import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RetouchStroke } from '@carplates/shared'

import { clamp01, extendStroke, paintStrokes } from '@/components/photo-blur-editor.helpers'
import { useBlurBrush } from '@/components/use-blur-brush'
import { cn } from '@/lib/cn'

type Props = {
  /** The photo as stored now (already blurred by the server). */
  src: string
  /** Strokes saved earlier in this dialog; the editor continues from them. */
  initial: RetouchStroke[]
  saving: boolean
  /** Translated error of the last save, if any. */
  error: string | null
  onSave: (strokes: RetouchStroke[]) => void
  onCancel: () => void
}

const ZOOMS = [1, 2, 3] as const

const TOOL_BUTTON =
  'rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg)] disabled:opacity-40'

/**
 * Manual blur editor of the Share dialog: a canvas laid over the preview records brush strokes as 0-1 polylines. The
 * canvas only shows where blur will be added / erased; the server re-renders the photo from its private original on Save,
 * so no pixels ever come from the client.
 */
export default function PhotoBlurEditor({ src, initial, saving, error, onSave, onCancel }: Props): ReactNode {
  const { t } = useTranslation()
  const brush = useBlurBrush(initial)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const draftRef = useRef<RetouchStroke | null>(null)
  const ringRef = useRef<{ x: number; y: number } | null>(null)
  const frameRef = useRef(0)
  // Zoom of the painting area (the photo is scaled inside a scrollable frame, so strokes stay precise on small details).
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1)

  const paint = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draft = draftRef.current
    const ring = ringRef.current
    paintStrokes(canvas, draft ? [...brush.strokes, draft] : brush.strokes, ring && { ...ring, radius: brush.radius })
  }

  // Pointer events arrive faster than frames: paint once per frame.
  const schedulePaint = (): void => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      paint()
    })
  }

  useEffect(() => (): void => cancelAnimationFrame(frameRef.current), [])

  // The canvas is an external system: repaint when the strokes or brush change and when the photo is resized.
  useEffect(() => {
    paint()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return (): void => observer.disconnect()
  })

  const pointAt = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [clamp01((e.clientX - rect.left) / (rect.width || 1)), clamp01((e.clientY - rect.top) / (rect.height || 1))]
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>): void => {
    if (saving) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draftRef.current = { mode: brush.mode, radius: brush.radius, points: [pointAt(e)] }
    schedulePaint()
  }

  const onMove = (e: PointerEvent<HTMLCanvasElement>): void => {
    const [x, y] = pointAt(e)
    ringRef.current = { x, y }
    const draft = draftRef.current
    if (draft) draftRef.current = { ...draft, points: extendStroke(draft.points, x, y, draft.radius) }
    schedulePaint()
  }

  const onUp = (): void => {
    const draft = draftRef.current
    draftRef.current = null
    if (draft) brush.commit(draft)
  }

  const onLeave = (): void => {
    ringRef.current = null
    schedulePaint()
  }

  return (
    <div className="space-y-2" aria-busy={saving}>
      <div className="relative">
        <div className="flex max-h-[60vh] overflow-auto rounded-lg bg-black/80 p-2">
          <span
            className="relative m-auto inline-block"
            style={zoom > 1 ? { width: `${zoom * 100}%`, flexShrink: 0 } : undefined}
          >
            <img
              src={src}
              alt=""
              className={cn('block rounded-lg select-none', zoom === 1 ? 'max-h-[50vh] max-w-full' : 'h-auto w-full')}
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={t('photoShare.edit.canvas')}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onPointerLeave={onLeave}
              className={cn(
                'absolute inset-0 h-full w-full touch-none rounded-lg',
                saving ? 'cursor-wait' : 'cursor-none'
              )}
            />
          </span>
        </div>
        <button
          type="button"
          onClick={() => setZoom(z => ZOOMS[(ZOOMS.indexOf(z) + 1) % ZOOMS.length] ?? 1)}
          aria-label={t('photoShare.edit.zoom', { level: zoom })}
          title={t('photoShare.edit.zoom', { level: zoom })}
          className="absolute top-2 right-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-black/60 px-2 text-base text-white hover:bg-black/80"
        >
          🔍{zoom > 1 && <span className="ml-1 text-xs">{zoom}x</span>}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['add', 'erase'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            aria-pressed={brush.mode === mode}
            onClick={() => brush.setMode(mode)}
            className={cn(TOOL_BUTTON, brush.mode === mode && 'border-[var(--color-primary)] font-medium')}
          >
            {t(`photoShare.edit.${mode}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={brush.smaller}
          disabled={!brush.canSmaller}
          aria-label={t('photoShare.edit.smaller')}
          title={t('photoShare.edit.smaller')}
          className={TOOL_BUTTON}
        >
          -
        </button>
        <button
          type="button"
          onClick={brush.larger}
          disabled={!brush.canLarger}
          aria-label={t('photoShare.edit.larger')}
          title={t('photoShare.edit.larger')}
          className={TOOL_BUTTON}
        >
          +
        </button>
        <button type="button" onClick={brush.undo} disabled={!brush.canUndo} className={TOOL_BUTTON}>
          {t('photoShare.edit.undo')}
        </button>
        <button type="button" onClick={brush.redo} disabled={!brush.canRedo} className={TOOL_BUTTON}>
          {t('photoShare.edit.redo')}
        </button>
      </div>

      <p className="text-xs text-[var(--color-muted)]">{t('photoShare.edit.hint')}</p>
      <p className="text-xs text-[var(--color-muted)]">{t('photoShare.edit.privacy')}</p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className={TOOL_BUTTON}>
          {t('photoShare.edit.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onSave(brush.strokes)}
          disabled={saving}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? t('photoShare.edit.saving') : t('photoShare.edit.save')}
        </button>
      </div>
    </div>
  )
}
