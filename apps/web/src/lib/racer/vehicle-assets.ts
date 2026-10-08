import { z } from 'zod'

import { type CarBody } from './config'
import platesJson from './assets/plates.json'

/**
 * Rear-view vehicle sprites rendered from the Kenney "Car Kit" (CC0, kenney.nl) by `scripts/racer-render/` — see
 * credits on About. Per model: `<name>.webp` (straight), `-l` / `-r` (steering) and, for cars that take the viewer's
 * paint colour, a transparent `<name>[-l|-r]-mask.webp` marking the body paint. Anything missing falls back to the
 * procedural art in ./sprites.ts, so a car without assets still works.
 *
 * Top-level await: the dynamic `import()` of the engine only resolves once the images are decoded, which keeps the
 * existing "loading" phase of the modal honest and `makeAtlas` synchronous.
 */

type Sprite = { img: HTMLCanvasElement; w: number; h: number; heavy?: boolean }

/** Logical sprite units per pixel: sets the on-road size of a model (the sedan lands at the old 80 units). */
const LOGICAL_PER_PX = 0.26

/** Body type → rendered model (Kenney Car Kit, plus the Quaternius bus and the Sketchfab motorbike). */
export const BODY_MODEL: Readonly<Record<CarBody, string>> = {
  sedan: 'sedan',
  hatch: 'hatchback-sports',
  suv: 'suv',
  sport: 'sedan-sports',
  pickup: 'truck',
  van: 'van',
  taxi: 'taxi',
  police: 'police',
  ambulance: 'ambulance',
  firetruck: 'firetruck',
  garbage: 'garbage-truck',
  bus: 'bus',
  moto: 'moto'
}

/** Models that keep their own livery in traffic (never recoloured) and the slow, wide ones. */
export const TRAFFIC_LIVERY: readonly string[] = ['taxi', 'police', 'ambulance']
export const TRAFFIC_HEAVY: readonly string[] = ['bus', 'delivery', 'garbage-truck', 'truck-flat', 'firetruck']

/** Models rendered by renderCustom (scripts/racer-render/render.html), not the Kenney colormap path. */
const CUSTOM_RENDERED: readonly string[] = ['bus', 'moto']

const URLS = import.meta.glob<string>('./assets/*.webp', { eager: true, query: '?url', import: 'default' })

const PLATES = z
  .record(z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable())
  .parse(platesJson)

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(url))
    img.src = url
  })
}

async function loadAll(): Promise<Map<string, HTMLImageElement>> {
  const entries = Object.entries(URLS)
  const settled = await Promise.allSettled(entries.map(([, url]) => loadImage(url)))
  const images = new Map<string, HTMLImageElement>()
  settled.forEach((r, i) => {
    const key = entries[i]?.[0].replace(/^.*\//, '').replace(/\.webp$/, '')
    if (r.status === 'fulfilled' && key) images.set(key, r.value)
  })
  return images
}

const IMAGES = await loadAll()

function canvasLike(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Never let a dark paint swallow the model's shading: multiply by black would erase every highlight. */
function paintColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lift = (c: number): number => Math.max(c, 34)
  return `rgb(${lift((n >> 16) & 255)},${lift((n >> 8) & 255)},${lift(n & 255)})`
}

/** The plate slot found at render time; some white-bodied models report the whole tailgate, so it is normalized. */
type Rect = readonly [number, number, number, number]

function plateRect(key: string): Rect | null {
  const r = PLATES[key]
  if (!r) return null
  let [x, y, w, h] = r
  if (w > 70) {
    x += w / 2 - 28
    w = 57
  }
  if (h > 40) {
    y += h - 28
    h = 28
  }
  return [x, y, w, h]
}

function paintPlate(ctx: CanvasRenderingContext2D, rect: Rect, text: string | null): void {
  const [x, y, w, h] = rect
  const pw = w * 0.96
  const ph = Math.min(h, pw / 3.1)
  const px = x + (w - pw) / 2
  const py = y + (h - ph) / 2
  ctx.fillStyle = '#222'
  ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2)
  ctx.fillStyle = '#f6f6f2'
  ctx.fillRect(px, py, pw, ph)
  if (!text) return
  ctx.fillStyle = '#111'
  ctx.font = `bold ${ph * 0.8}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, px + pw / 2, py + ph / 2 + 0.5, pw - 3)
}

/** True when this model's straight view was loaded. */
export function hasVehicle(model: string): boolean {
  return IMAGES.has(model)
}

/**
 * One rear-view sprite, or `null` when the model has no image (caller falls back to the procedural car). `color` paints
 * the body when the model has a mask, `null` keeps the model's own livery.
 */
export function vehicleSprite(
  model: string,
  color: string | null,
  plate: string | null,
  steer: -1 | 0 | 1 = 0,
  heavy = false
): Sprite | null {
  // the -l/-r files are named by camera yaw, which leans the car the opposite way: left steering uses the -r file.
  // The Kenney cars and the custom-rendered models (bus, motorbike) were rendered with opposite camera handedness.
  const swap = !CUSTOM_RENDERED.includes(model)
  const left = swap ? '-r' : '-l'
  const right = swap ? '-l' : '-r'
  const suffix = steer < 0 ? left : steer > 0 ? right : ''
  const key = model + suffix
  const base = IMAGES.get(key)
  if (!base) return null
  const out = canvasLike(base.width, base.height)
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(base, 0, 0)

  const mask = color ? IMAGES.get(`${key}-mask`) : undefined
  if (color && mask) {
    const layer = canvasLike(base.width, base.height)
    const lg = layer.getContext('2d')
    if (lg) {
      lg.fillStyle = paintColor(color)
      lg.fillRect(0, 0, base.width, base.height)
      lg.globalCompositeOperation = 'destination-in'
      lg.drawImage(mask, 0, 0)
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(layer, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const rect = plateRect(key)
  if (rect) paintPlate(ctx, rect, plate)
  return { img: out, w: base.width * LOGICAL_PER_PX, h: base.height * LOGICAL_PER_PX, heavy }
}
