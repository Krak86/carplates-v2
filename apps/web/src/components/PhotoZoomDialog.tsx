import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import PhotoPlateBoxes from '@/components/PhotoPlateBoxes'

const MIN_SCALE = 1
const MAX_SCALE = 8
const WHEEL_STEP = 1.15
const BUTTON_STEP = 1.4
const KEY_PAN_PX = 60

type Props = {
  url: string
  candidates: PlateCandidate[]
  active: string | null
  onClose: () => void
}

type View = { scale: number; x: number; y: number }

const FIT: View = { scale: 1, x: 0, y: 0 }

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

// Zooms by `factor` keeping the point (px, py) — measured from the viewport
// centre — fixed on screen, so the wheel zooms toward the cursor.
function zoomAt(view: View, factor: number, px: number, py: number): View {
  const scale = clampScale(view.scale * factor)
  if (scale === MIN_SCALE) return FIT
  const ratio = scale / view.scale
  return { scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }
}

export default function PhotoZoomDialog({ url, candidates, active, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<number | null>(null)
  const [view, setView] = useState<View>(FIT)
  const [showBoxes, setShowBoxes] = useState(true)

  // React attaches wheel listeners as passive, which can't preventDefault the
  // page scroll — so this one is wired by hand.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left - rect.width / 2
      const py = e.clientY - rect.top - rect.height / 2
      setView(v => zoomAt(v, e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, px, py))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return (): void => el.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    viewportRef.current?.focus()
  }, [])

  const handleZoomButton = (factor: number): void => setView(v => zoomAt(v, factor, 0, 0))

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    pinchRef.current = null
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const pointers = pointersRef.current
    const last = pointers.get(e.pointerId)
    if (!last) return
    const next = { x: e.clientX, y: e.clientY }

    if (pointers.size >= 2) {
      // Two fingers: pinch-zoom around their midpoint, and pan with the midpoint.
      const other = [...pointers].find(([id]) => id !== e.pointerId)?.[1]
      pointers.set(e.pointerId, next)
      if (!other) return
      const dist = Math.hypot(next.x - other.x, next.y - other.y)
      const prev = pinchRef.current
      pinchRef.current = dist
      if (prev === null || prev === 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = (next.x + other.x) / 2 - rect.left - rect.width / 2
      const py = (next.y + other.y) / 2 - rect.top - rect.height / 2
      const dx = (next.x - last.x) / 2
      const dy = (next.y - last.y) / 2
      setView(v => {
        const z = zoomAt(v, dist / prev, px, py)
        return z === FIT ? z : { ...z, x: z.x + dx, y: z.y + dy }
      })
      return
    }

    pointers.set(e.pointerId, next)
    const dx = next.x - last.x
    const dy = next.y - last.y
    setView(v => (v.scale === MIN_SCALE ? v : { ...v, x: v.x + dx, y: v.y + dy }))
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    pointersRef.current.delete(e.pointerId)
    pinchRef.current = null
  }

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left - rect.width / 2
    const py = e.clientY - rect.top - rect.height / 2
    setView(v => (v.scale > MIN_SCALE ? FIT : zoomAt(v, 3, px, py)))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case '+':
      case '=':
        handleZoomButton(BUTTON_STEP)
        break
      case '-':
        handleZoomButton(1 / BUTTON_STEP)
        break
      case '0':
        setView(FIT)
        break
      case 'b':
      case 'B':
        setShowBoxes(v => !v)
        break
      case 'ArrowLeft':
        setView(v => (v.scale === MIN_SCALE ? v : { ...v, x: v.x + KEY_PAN_PX }))
        break
      case 'ArrowRight':
        setView(v => (v.scale === MIN_SCALE ? v : { ...v, x: v.x - KEY_PAN_PX }))
        break
      case 'ArrowUp':
        setView(v => (v.scale === MIN_SCALE ? v : { ...v, y: v.y + KEY_PAN_PX }))
        break
      case 'ArrowDown':
        setView(v => (v.scale === MIN_SCALE ? v : { ...v, y: v.y - KEY_PAN_PX }))
        break
      default:
        return
    }
    e.preventDefault()
  }

  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80'

  // Portaled: view-transition-named ancestors (<main>, search field, card) are stacking contexts and
  // transformed ancestors are `fixed` containing blocks — inline, this sat under the header and stats panels.
  return createPortal(
    <div className="fixed inset-0 z-40 bg-black/90" role="dialog" aria-modal aria-label={t('photo.zoomTitle')}>
      <div
        ref={viewportRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`flex h-full w-full touch-none items-center justify-center overflow-hidden outline-none ${
          view.scale > MIN_SCALE ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
      >
        <span
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          className="relative block"
        >
          <img src={url} alt="" draggable={false} className="block max-h-[100dvh] max-w-[100vw] select-none" />
          {showBoxes && <PhotoPlateBoxes candidates={candidates} active={active} />}
        </span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBoxes(v => !v)}
          aria-pressed={showBoxes}
          aria-label={showBoxes ? t('photo.boxesHide') : t('photo.boxesShow')}
          title={showBoxes ? t('photo.boxesHide') : t('photo.boxesShow')}
          className={`${buttonClass} ${showBoxes ? '' : 'opacity-60'}`}
        >
          🏷
        </button>
        <button
          type="button"
          onClick={() => handleZoomButton(1 / BUTTON_STEP)}
          aria-label={t('photo.zoomOut')}
          className={buttonClass}
        >
          −
        </button>
        <button type="button" onClick={() => setView(FIT)} aria-label={t('photo.zoomReset')} className={buttonClass}>
          ⤢
        </button>
        <button
          type="button"
          onClick={() => handleZoomButton(BUTTON_STEP)}
          aria-label={t('photo.zoomIn')}
          className={buttonClass}
        >
          +
        </button>
        <button type="button" onClick={onClose} aria-label={t('photo.zoomClose')} className={buttonClass}>
          ✕
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        {t('photo.zoomHint')}
      </p>
    </div>,
    document.body
  )
}
