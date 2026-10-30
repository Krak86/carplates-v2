import type { VehicleSize } from '@/components/size/use-vehicle-size'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'

export const PANEL_VIEWS = ['side', 'top', 'front'] as const
export type PanelView = (typeof PANEL_VIEWS)[number]
/** What the reader picks: one view or all three drawn together. */
export const VIEW_CHOICES = ['all', ...PANEL_VIEWS] as const
export type ViewChoice = (typeof VIEW_CHOICES)[number]
/** `beside` puts A left and B right, each with its own arrows; `inplace` draws both cars at the same spot with a draggable divider: A on one side of it, B on the other. */
export const OVERLAY_MODES = ['overlay', 'beside', 'stack', 'inplace'] as const
export type OverlayMode = (typeof OVERLAY_MODES)[number]

/** A car with all three outer sizes known from data (a forecast is never drawn as if it were a figure). */
export type DrawnCar = {
  shape: SizeShape
  lengthMm: number
  widthMm: number
  heightMm: number
  wheelbaseMm: number | null
}

/** Mirrors and tyres stick out of the body by this much on each side in the top view. */
const SIDE_PAD_MM = 200

export function drawnCar(size: VehicleSize | null): DrawnCar | null {
  const f = size?.figures
  if (!size || !f?.lengthMm || !f.widthMm || !f.heightMm) return null
  if ([f.lengthMm, f.widthMm, f.heightMm].some(x => x.source === 'estimate')) return null
  const wb = f.wheelbaseMm && f.wheelbaseMm.source !== 'estimate' ? f.wheelbaseMm.value : null
  return {
    shape: size.shape,
    lengthMm: f.lengthMm.value,
    widthMm: f.widthMm.value,
    heightMm: f.heightMm.value,
    wheelbaseMm: wb
  }
}

/** The views a choice draws, in order; `front` only when both shapes have a front drawing. */
export function viewsFor(choice: ViewChoice, hasFront: boolean): PanelView[] {
  const all: PanelView[] = hasFront ? [...PANEL_VIEWS] : ['side', 'top']
  if (choice === 'all') return all
  return all.includes(choice) ? [choice] : ['side']
}

type Point = { x: number; y: number }

export type Panel = {
  view: PanelView
  /** Top-left corner of each car's body box in drawing millimetres. */
  at: readonly [Point, Point]
  /** Which dimension row each car's arrows use (0 or 1): cars drawn on top of each other get separate rows. */
  dimRow: readonly [number, number]
}

export type Scene = {
  viewBox: readonly [x: number, y: number, w: number, h: number]
  panels: Panel[]
  /** Distance between two dimension-arrow rows; also the arrow label size basis. */
  lvl: number
}

const bodyExtent = (view: PanelView, c: DrawnCar): number => (view === 'top' ? c.widthMm : c.heightMm)
/** How far the car reaches along the drawing's x axis (the front view looks at the nose, so it is the width). */
const alongX = (view: PanelView, c: DrawnCar): number => (view === 'front' ? c.widthMm : c.lengthMm)

/**
 * True scale, rear bumpers on one line (nose to the right). `overlay` and `inplace` put both cars on the same ground /
 * centre line, `beside` puts B to the right of A, `stack` puts B under A. Top view is centred on the car's axis, side
 * and front views stand on the ground. Every panel leaves room for its dimension arrows.
 */
export function buildScene(cars: readonly [DrawnCar, DrawnCar], views: readonly PanelView[], mode: OverlayMode): Scene {
  const longest = Math.max(cars[0].lengthMm, cars[1].lengthMm)
  const lvl = longest * 0.075
  const beside = mode === 'beside'
  const stacked = mode === 'stack'
  const sameSpot = !beside && !stacked
  const panels: Panel[] = []
  let cursor = 0
  let contentW = longest

  for (const view of views) {
    const inset = view === 'top' ? SIDE_PAD_MM : 0
    const ext = (c: DrawnCar): number => bodyExtent(view, c) + 2 * inset
    const [ea, eb] = [ext(cars[0]), ext(cars[1])]
    const carGap = lvl * (beside ? 3.4 : 2)
    const band = stacked ? ea + carGap + eb : Math.max(ea, eb)
    const rowY = stacked ? [0, ea + carGap] : [0, 0]
    const align = (own: number): number => {
      if (stacked) return 0
      return view === 'top' ? (Math.max(ea, eb) - own) / 2 : Math.max(ea, eb) - own
    }
    const [wa, wb] = [alongX(view, cars[0]), alongX(view, cars[1])]
    const x = (c: DrawnCar, own: number): number => {
      if (beside) return own === 0 ? 0 : wa + carGap
      return view === 'front' ? (longest - c.widthMm) / 2 : 0
    }
    if (beside) contentW = Math.max(contentW, wa + carGap + wb)

    panels.push({
      view,
      at: [
        { x: x(cars[0], 0), y: cursor + (rowY[0] ?? 0) + align(ea) + inset },
        { x: x(cars[1], 1), y: cursor + (rowY[1] ?? 0) + align(eb) + inset }
      ],
      dimRow: sameSpot ? [0, 1] : [0, 0]
    })
    cursor += band + lvl * (sameSpot ? 2.4 : 1.6) + lvl * 1.2
  }

  const margin = lvl * (sameSpot ? 3.2 : 2.2)
  const total = cursor - lvl * 1.2
  return {
    viewBox: [-margin, -lvl * 0.5, contentW + 2 * margin, total + lvl],
    panels,
    lvl
  }
}
