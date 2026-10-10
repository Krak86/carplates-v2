import { z } from 'zod'
import { brandLogoUrl } from '@carplates/shared'

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

type Sprite = { img: HTMLCanvasElement; w: number; h: number; heavy?: boolean; brake?: HTMLCanvasElement }

/** Logical sprite units per pixel: sets the on-road size of a model (the sedan lands at the old 80 units). */
const LOGICAL_PER_PX = 0.26

/** Body type → rendered model (Kenney Car Kit, plus the CC-BY Sketchfab models — see docs/plan-done.md "Racer art pass"). */
export const BODY_MODEL: Readonly<Record<CarBody, string>> = {
  sedan: 'sedan-toyama',
  hatch: 'hatch-mag80',
  suv: 'suv-hummer',
  sport: 'sport-juff',
  pickup: 'pickup-silv',
  van: 'van-gmc',
  taxi: 'taxi',
  police: 'police',
  ambulance: 'ambulance',
  firetruck: 'firetruck',
  garbage: 'garbage-truck',
  bus: 'bus-green',
  moto: 'moto'
}

/** Models that keep their own livery in traffic (never recoloured) and the slow, wide ones. */
export const TRAFFIC_LIVERY: readonly string[] = ['taxi', 'police', 'ambulance']
export const TRAFFIC_HEAVY: readonly string[] = ['bus-green', 'delivery', 'garbage-truck', 'truck-flat', 'firetruck']

/** Models rendered by renderCustom (scripts/racer-render/render.html), not the Kenney colormap path. */
const CUSTOM_RENDERED: readonly string[] = [
  'bus-green',
  'moto',
  'hatch-mag80',
  'sport-juff',
  'sedan-toyama',
  'van-gmc',
  'suv-hummer',
  'pickup-silv'
]

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

const LOGOS = new Map<string, HTMLImageElement | null>()

/** Fetches the brand's logo once (a missing or broken one is remembered as `null`) so `vehicleSprite` can stick it on. */
export async function preloadBrandLogo(brand: string | null): Promise<void> {
  const url = brandLogoUrl(brand)
  if (!url || LOGOS.has(url)) return
  LOGOS.set(url, await loadImage(url).catch(() => null))
}

function brandLogo(brand: string | null): HTMLImageElement | null {
  const url = brandLogoUrl(brand)
  return (url && LOGOS.get(url)) || null
}

/** A round chrome badge with the brand logo, centred at (cx, cy), like the emblem on a real tailgate. */
function paintLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, cx: number, cy: number, d: number): void {
  const r = d / 2
  const ring = ctx.createLinearGradient(cx, cy - r, cx, cy + r)
  ring.addColorStop(0, '#f2f2f2')
  ring.addColorStop(1, '#7d7d7d')
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.fillRect(cx - r, cy - r, d, d)
  const iw = logo.naturalWidth || 1
  const ih = logo.naturalHeight || 1
  const fit = (d * 0.74) / Math.max(iw, ih)
  ctx.drawImage(logo, cx - (iw * fit) / 2, cy - (ih * fit) / 2, iw * fit, ih * fit)
  ctx.restore()
}

const BRAKE_RGB = [255, 70, 55] as const
const BRAKES = new Map<string, HTMLCanvasElement>()

/**
 * The lit brake lights of one sprite: its saturated-red pixels (the tail lamps) recoloured bright and bloomed. A model
 * whose body is itself red (no lamps stand out) gets two plain blobs at the usual lamp spots instead.
 */
function brakeOverlay(key: string, base: HTMLImageElement): HTMLCanvasElement {
  const cached = BRAKES.get(key)
  if (cached) return cached
  const { width: w, height: h } = base
  const mask = canvasLike(w, h)
  const mctx = mask.getContext('2d', { willReadFrequently: true })
  const out = canvasLike(w, h)
  const octx = out.getContext('2d')
  if (!mctx || !octx) return out

  mctx.drawImage(base, 0, 0)
  const px = mctx.getImageData(0, 0, w, h)
  const d = px.data
  let lamp = 0
  let opaque = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] as number
    const g = d[i + 1] as number
    const b = d[i + 2] as number
    const isLamp = (d[i + 3] as number) > 200 && r > 150 && r > g * 2 && r > b * 2
    if ((d[i + 3] as number) > 200) opaque++
    if (isLamp) {
      lamp++
      d[i] = BRAKE_RGB[0]
      d[i + 1] = BRAKE_RGB[1]
      d[i + 2] = BRAKE_RGB[2]
      d[i + 3] = 255
    } else {
      d[i + 3] = 0
    }
  }
  if (lamp >= 30 && lamp / opaque <= 0.06) {
    mctx.putImageData(px, 0, 0)
  } else {
    mctx.clearRect(0, 0, w, h)
    mctx.fillStyle = `rgb(${BRAKE_RGB.join(',')})`
    for (const x of [0.14, 0.86]) {
      mctx.beginPath()
      mctx.ellipse(w * x, h * 0.47, w * 0.05, h * 0.035, 0, 0, Math.PI * 2)
      mctx.fill()
    }
  }

  octx.filter = `blur(${Math.max(2, w * 0.016)}px)`
  octx.drawImage(mask, 0, 0)
  octx.drawImage(mask, 0, 0)
  octx.filter = 'none'
  octx.drawImage(mask, 0, 0)
  BRAKES.set(key, out)
  return out
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
  heavy = false,
  player?: { brand: string | null }
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

  const logo = player ? brandLogo(player.brand) : null
  if (rect && logo) {
    // on the boot lid, centred above the plate
    const d = rect[2] * 0.55
    paintLogo(ctx, logo, rect[0] + rect[2] / 2, rect[1] - d * 1.1, d)
  }

  return {
    img: out,
    w: base.width * LOGICAL_PER_PX,
    h: base.height * LOGICAL_PER_PX,
    heavy,
    brake: player ? brakeOverlay(key, base) : undefined
  }
}
