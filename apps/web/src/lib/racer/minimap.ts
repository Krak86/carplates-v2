/*
 * The test-drive mini-map: a rotating top-down radar of the road the engine generated. There is no real map data - the
 * heading is integrated from the engine's per-segment `curve`, so the map bends exactly where the pseudo-3D road bends.
 * The view is always relative to the player (road heading under the car = up), so the heading that drifts over laps
 * (the lap does not close in 2D) never matters. Pure geometry + canvas drawing; the engine only exposes a `MapTrack`.
 */
import type { RoadColor } from './config'

export type MapKind = 'oak' | 'pine' | 'poplar' | 'plant' | 'post' | 'sign'
export type MapObject = { kind: MapKind; offset: number }
/** Structurally the engine's `Car`: lateral `offset` (road edge = ±1), `percent` along its segment, heavy vehicles are longer. */
export type MapCar = { offset: number; percent: number; sprite: { heavy?: boolean } }

/** A read-only view of the engine's road. The accessors read the engine's current arrays, so a rebuilt road is picked up. */
export type MapTrack = {
  count: number
  /** Map units from the road centre to its edge (the engine's road half-width in segments). */
  halfWidth: number
  curve: (i: number) => number
  objects: (i: number) => readonly MapObject[]
  cars: (i: number) => readonly MapCar[]
}

export type MapState = {
  /** Fractional segment index under the car. */
  s: number
  /** Car lateral position, road edge = ±1. */
  playerX: number
}

export type MapView = { track: MapTrack; state: () => MapState }

export type MapStyle = {
  road: RoadColor
  leaf: readonly [string, string]
  /** `#rrggbb` body colour of the player's car. */
  player: string
}

/** Radians of turn per unit of `curve` per segment: a hold-50 MEDIUM curve with its eases turns the road about 90°. */
export const TURN_PER_CURVE = 0.0045
/** Segments drawn behind and ahead of the car (a segment is one map unit long). */
export const BACK = 80
export const AHEAD = 190
/** Map units across the square view; the car sits `PLAYER_AT` of the way down. */
export const VIEW = 260
export const PLAYER_AT = 0.7

const POINTS = BACK + AHEAD + 1

/** Scratch buffers (module-level: the map redraws every frame, nothing is allocated). `x`/`y` = segment boundary, `h` = heading. */
export const layout = {
  x: new Float32Array(POINTS),
  y: new Float32Array(POINTS),
  h: new Float32Array(POINTS)
}

const wrap = (i: number, count: number): number => ((i % count) + count) % count

/**
 * Fills `layout` with the road centreline around fractional segment `s`: index `k` is segment `floor(s) - BACK + k`.
 * Heading 0 = up on the screen, positive = clockwise (a positive engine curve bends the road to the right).
 */
export function layoutRoad(track: MapTrack, s: number): void {
  const { x, y, h } = layout
  const i0 = Math.floor(s)
  const frac = s - i0
  h[BACK] = 0
  x[BACK] = 0
  y[BACK] = frac // the boundary behind the car; the car itself sits at the origin
  for (let k = BACK; k < POINTS - 1; k++) {
    const hk = h[k] as number
    x[k + 1] = (x[k] as number) + Math.sin(hk)
    y[k + 1] = (y[k] as number) - Math.cos(hk)
    h[k + 1] = hk + TURN_PER_CURVE * track.curve(wrap(i0 + k - BACK, track.count))
  }
  for (let k = BACK - 1; k >= 0; k--) {
    const hk = (h[k + 1] as number) - TURN_PER_CURVE * track.curve(wrap(i0 + k - BACK, track.count))
    h[k] = hk
    x[k] = (x[k + 1] as number) - Math.sin(hk)
    y[k] = (y[k + 1] as number) + Math.cos(hk)
  }
}

const OBJECT_RADIUS: Readonly<Record<'oak' | 'pine' | 'poplar' | 'plant', number>> = {
  oak: 4,
  pine: 3.5,
  poplar: 2.5,
  plant: 1.6
}
const CAR_W = 5
const CAR_LEN = 13
const HEAVY_LEN = 22
const SIGN_COLOR = '#e0a030'
const POST_COLOR = '#cfcfcf'
const TRAFFIC_COLOR = '#e8e8e8'
const HEAVY_COLOR = '#9aa4b0'

/** Draws one frame into a square canvas context of `size` device pixels. */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  track: MapTrack,
  state: MapState,
  style: MapStyle
): void {
  const unit = size / VIEW
  const { x, y, h } = layout
  const w = track.halfWidth
  layoutRoad(track, state.s)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = style.road.grass
  ctx.fillRect(0, 0, size, size)
  ctx.setTransform(unit, 0, 0, unit, size / 2, size * PLAYER_AT)

  // the road ribbon: left edge forward, right edge back
  ctx.beginPath()
  for (let k = 0; k < POINTS; k++)
    ctx.lineTo((x[k] as number) - Math.cos(h[k] as number) * w, (y[k] as number) - Math.sin(h[k] as number) * w)
  for (let k = POINTS - 1; k >= 0; k--)
    ctx.lineTo((x[k] as number) + Math.cos(h[k] as number) * w, (y[k] as number) + Math.sin(h[k] as number) * w)
  ctx.closePath()
  ctx.fillStyle = style.road.road
  ctx.fill()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = style.road.rumble
  ctx.stroke()

  ctx.beginPath()
  for (let k = 0; k < POINTS; k++) ctx.lineTo(x[k] as number, y[k] as number)
  ctx.setLineDash([6, 8])
  ctx.lineWidth = 1
  ctx.strokeStyle = style.road.lane ?? '#cccccc'
  ctx.stroke()
  ctx.setLineDash([])

  const near = VIEW / 2 + 12
  const ahead = VIEW * PLAYER_AT + 12
  const behind = VIEW * (1 - PLAYER_AT) + 12
  const i0 = Math.floor(state.s)

  for (let k = 0; k < POINTS - 1; k++) {
    const j = wrap(i0 + k - BACK, track.count)
    const hk = h[k] as number
    const nx = Math.cos(hk)
    const ny = Math.sin(hk)
    const dx = Math.sin(hk)
    const dy = -Math.cos(hk)

    for (const o of track.objects(j)) {
      const px = (x[k] as number) + nx * o.offset * w
      const py = (y[k] as number) + ny * o.offset * w
      if (px < -near || px > near || py < -ahead || py > behind) continue
      if (o.kind === 'sign') {
        ctx.fillStyle = SIGN_COLOR
        ctx.fillRect(px - 4, py - 1.5, 8, 3)
      } else if (o.kind === 'post') {
        ctx.fillStyle = POST_COLOR
        ctx.fillRect(px - 0.8, py - 0.8, 1.6, 1.6)
      } else {
        ctx.fillStyle = o.kind === 'plant' || o.kind === 'oak' ? style.leaf[1] : style.leaf[0]
        ctx.beginPath()
        ctx.arc(px, py, OBJECT_RADIUS[o.kind], 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (const car of track.cars(j)) {
      const px = (x[k] as number) + nx * car.offset * w + dx * car.percent
      const py = (y[k] as number) + ny * car.offset * w + dy * car.percent
      if (px < -near || px > near || py < -ahead || py > behind) continue
      const len = car.sprite.heavy ? HEAVY_LEN : CAR_LEN
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(hk)
      ctx.fillStyle = car.sprite.heavy ? HEAVY_COLOR : TRAFFIC_COLOR
      ctx.fillRect(-CAR_W / 2, -len / 2, CAR_W, len)
      ctx.restore()
    }
  }

  // the player: an arrow on the road, shifted sideways with the steering
  ctx.save()
  ctx.translate(state.playerX * w, 0)
  ctx.beginPath()
  ctx.moveTo(0, -9)
  ctx.lineTo(6, 7)
  ctx.lineTo(0, 3.5)
  ctx.lineTo(-6, 7)
  ctx.closePath()
  ctx.fillStyle = style.player
  ctx.fill()
  ctx.lineWidth = 1.4
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.restore()
}
