/**
 * Paint scan core for the wiki photo colour filter (docs/wiki-recolor-plan.md, step 2). Pure: pixels in, a verdict and a
 * shading mask out. The SegFormer `car` probability map, download and DB writes live in `wiki-paint.ts`.
 *
 * Pipeline: largest connected `car` component -> Lab k-means inside it -> the body-band cluster is "the paint" -> every
 * pixel gets a paint weight (hue + chroma match for coloured paint, lightness band for neutral) -> gates -> RGBA mask
 * (RGB = body shading `g`, A = paint weight). The client multiplies a target colour by the shading (`applyPaint` here
 * is the same maths, used by the CLI preview and the tests).
 */
import {
  PAINT_HEX,
  hexToRgb,
  linearToSrgb,
  luminanceOf,
  paintBucketOf,
  rgbToLab,
  srgbToLinear,
  type Lab,
  type VehicleColor
} from '@carplates/shared'

/** Working width of a scan and of the stored mask. */
export const PAINT_SCAN_WIDTH = 640
/** Bump to make the scan job redo rows made by an older algorithm. */
export const PAINT_ALGO = 1
/** Shading byte = `min(g, SHADE_MAX) * SHADE_SCALE`; g is the pixel luminance over the median body luminance. */
export const SHADE_MAX = 3
export const SHADE_SCALE = 255 / SHADE_MAX

export const PAINT_SKIP_REASONS = [
  'no_car',
  'car_too_small',
  'car_too_big',
  'multiple_cars',
  'wrap',
  'dark_neutral',
  'low_coverage'
] as const
export type PaintSkipReason = (typeof PAINT_SKIP_REASONS)[number]

export type PaintScanInput = {
  /** Interleaved RGB, `width * height * 3`. */
  rgb: Uint8Array
  width: number
  height: number
  /** Car probability 0-255 (SegFormer `car` mask resized to the image), `width * height`. */
  prob: Uint8Array
}

export type PaintScanResult =
  | { status: 'skip'; reason: PaintSkipReason; bodyArea: number | null }
  | {
      status: 'ok'
      /** Nearest registry colour of the median body Lab. */
      bucket: VehicleColor
      /** Median Lab of the confidently painted pixels. */
      lab: Lab
      /** Centre of the chosen k-means cluster. */
      paintLab: Lab
      /** Share of the image covered by the car component. */
      bodyArea: number
      /** Share of the car component matching the paint. */
      paintShare: number
      /** RGBA, `width * height * 4`: RGB = shading, A = paint weight. */
      mask: Uint8Array
    }

const CAR_THRESHOLD = 127
const K = 5
const MIN_AREA = 0.08
const MAX_AREA = 0.92
const MIN_PAINT_SHARE = 0.12
const COLOURED_CHROMA = 20
const BLUR_SIGMA = 1.1

type Component = { id: number; area: number; center: boolean; x0: number; x1: number; y0: number; y1: number }

/** Connected components (4-neighbour) of `prob > threshold`, largest first (a component through the centre counts double). */
export function carComponents(prob: Uint8Array, w: number, h: number): { labels: Int32Array; comps: Component[] } {
  const N = w * h
  const labels = new Int32Array(N)
  const comps: Component[] = []
  const stack = new Int32Array(N)
  for (let s = 0; s < N; s++) {
    if (prob[s]! <= CAR_THRESHOLD || labels[s]) continue
    const id = comps.length + 1
    let sp = 0
    const c: Component = { id, area: 0, center: false, x0: w, x1: 0, y0: h, y1: 0 }
    stack[sp++] = s
    labels[s] = id
    while (sp) {
      const p = stack[--sp]!
      c.area++
      const x = p % w
      const y = (p / w) | 0
      if (x < c.x0) c.x0 = x
      if (x > c.x1) c.x1 = x
      if (y < c.y0) c.y0 = y
      if (y > c.y1) c.y1 = y
      if (x > w * 0.35 && x < w * 0.65 && y > h * 0.35 && y < h * 0.65) c.center = true
      const visit = (q: number): void => {
        if (prob[q]! > CAR_THRESHOLD && !labels[q]) {
          labels[q] = id
          stack[sp++] = q
        }
      }
      if (x > 0) visit(p - 1)
      if (x < w - 1) visit(p + 1)
      if (y > 0) visit(p - w)
      if (y < h - 1) visit(p + w)
    }
    comps.push(c)
  }
  comps.sort((a, b) => b.area * (b.center ? 2 : 1) - a.area * (a.center ? 2 : 1))
  return { labels, comps }
}

/** Separable gaussian blur of a single-channel float image (edge-clamped). */
export function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3))
  const kernel = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)))
  const sum = kernel.reduce((a, b) => a + b, 0)
  for (let i = 0; i < kernel.length; i++) kernel[i]! /= sum
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let k = -r; k <= r; k++) a += src[y * w + Math.min(w - 1, Math.max(0, x + k))]! * kernel[k + r]!
      tmp[y * w + x] = a
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let k = -r; k <= r; k++) a += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]! * kernel[k + r]!
      out[y * w + x] = a
    }
  }
  return out
}

/** Hue-spread check: many saturated pixels spread over many hue bins = wrap / livery / multi-colour. */
function isWrapped(lab: Float32Array, idx: Int32Array): boolean {
  const bins = new Array<number>(12).fill(0)
  let sat = 0
  for (const i of idx) {
    const a = lab[i * 3 + 1]!
    const b = lab[i * 3 + 2]!
    if (Math.hypot(a, b) > 22) {
      sat++
      bins[Math.floor(((Math.atan2(b, a) + Math.PI) / (2 * Math.PI)) * 12) % 12]!++
    }
  }
  const sorted = [...bins].sort((a, b) => b - a)
  const satShare = sat / idx.length
  const concentration = (sorted[0]! + sorted[1]!) / Math.max(sat, 1)
  return (satShare > 0.3 && concentration < 0.6) || (satShare > 0.15 && concentration < 0.5)
}

function kMeans(lab: Float32Array, idx: Int32Array): { cent: Lab[]; assign: (p: number) => number } {
  const step = Math.max(1, Math.floor(idx.length / 20000))
  const sub: number[] = []
  for (let j = 0; j < idx.length; j += step) sub.push(idx[j]!)
  const sorted = [...sub].sort((a, b) => lab[a * 3]! - lab[b * 3]!)
  let cent: Lab[] = Array.from({ length: K }, (_, k) => {
    const p = sorted[Math.floor(((k + 0.5) / K) * sorted.length)]!
    return [lab[p * 3]!, lab[p * 3 + 1]!, lab[p * 3 + 2]!] as Lab
  })
  const nearest = (p: number): number => {
    let best = 0
    let bd = Infinity
    for (let k = 0; k < K; k++) {
      const c = cent[k]!
      const d = (lab[p * 3]! - c[0]) ** 2 + (lab[p * 3 + 1]! - c[1]) ** 2 + (lab[p * 3 + 2]! - c[2]) ** 2
      if (d < bd) {
        bd = d
        best = k
      }
    }
    return best
  }
  for (let it = 0; it < 14; it++) {
    const acc = Array.from({ length: K }, () => [0, 0, 0, 0])
    for (const p of sub) {
      const a = acc[nearest(p)]!
      a[0]! += lab[p * 3]!
      a[1]! += lab[p * 3 + 1]!
      a[2]! += lab[p * 3 + 2]!
      a[3]!++
    }
    cent = acc.map((s, k) => (s[3]! ? ([s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!] as Lab) : cent[k]!))
  }
  return { cent, assign: nearest }
}

function median(values: number[]): number {
  values.sort((x, y) => x - y)
  return values[values.length >> 1] ?? 0
}

export function scanPaint({ rgb, width: w, height: h, prob }: PaintScanInput): PaintScanResult {
  const N = w * h
  const { labels, comps } = carComponents(prob, w, h)
  const c0 = comps[0]
  if (!c0) return { status: 'skip', reason: 'no_car', bodyArea: null }
  const bodyArea = c0.area / N
  if (bodyArea < MIN_AREA) return { status: 'skip', reason: 'car_too_small', bodyArea }
  if (bodyArea > MAX_AREA) return { status: 'skip', reason: 'car_too_big', bodyArea }
  if (comps.length > 1 && comps[1]!.area > c0.area * 0.6) return { status: 'skip', reason: 'multiple_cars', bodyArea }

  const idx = new Int32Array(c0.area)
  for (let i = 0, j = 0; i < N; i++) if (labels[i] === c0.id) idx[j++] = i
  const lab = new Float32Array(N * 3)
  for (const i of idx) lab.set(rgbToLab(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!), i * 3)

  if (isWrapped(lab, idx)) return { status: 'skip', reason: 'wrap', bodyArea }

  const { cent, assign } = kMeans(lab, idx)

  // Paint cluster: area in the body band (10-62 % of the box height, inner 90 % of the width); dark clusters (glass, tyres) penalised.
  const bh = c0.y1 - c0.y0 + 1
  const bw = c0.x1 - c0.x0 + 1
  const score = new Array<number>(K).fill(0)
  const asg = new Uint8Array(N)
  for (const p of idx) {
    const k = assign(p)
    asg[p] = k
    const fy = (((p / w) | 0) - c0.y0) / bh
    const fx = ((p % w) - c0.x0) / bw
    if (fy > 0.1 && fy < 0.62 && fx > 0.05 && fx < 0.95) score[k]!++
  }
  for (let k = 0; k < K; k++) {
    const c = cent[k]!
    if (c[0] < 25) score[k]! *= 0.5
    if (c[0] < 40 && Math.hypot(c[1], c[2]) < 8) score[k]! *= 0.7
  }
  const pk = score.indexOf(Math.max(...score))
  const c = cent[pk]!

  let ss = 0
  let sn = 0
  for (const p of idx) {
    if (asg[p] !== pk) continue
    ss += (lab[p * 3]! - c[0]) ** 2 + (lab[p * 3 + 1]! - c[1]) ** 2 + (lab[p * 3 + 2]! - c[2]) ** 2
    sn++
  }
  const sigma = Math.max(7, Math.sqrt(ss / Math.max(sn, 1)) * 1.3)

  // Paint weight: coloured paint matches hue + chroma only (body lightness varies a lot), neutral a wide lightness band + low chroma.
  const paintChroma = Math.hypot(c[1], c[2])
  const weight = new Float32Array(N)
  let strong = 0
  let yMean = 0
  for (const p of idx) {
    const L = lab[p * 3]!
    const a = lab[p * 3 + 1]!
    const b = lab[p * 3 + 2]!
    let v: number
    if (paintChroma > COLOURED_CHROMA) {
      const dab = (a - c[1]) ** 2 + (b - c[2]) ** 2
      v = Math.exp(-dab / (2 * Math.max(10, sigma * 0.8) ** 2)) * Math.min(1, Math.max(0, (L - 14) / 14))
    } else {
      const sl = Math.max(16, sigma * 1.5)
      v = Math.exp(-((L - c[0]) ** 2) / (2 * sl * sl)) * Math.exp(-(Math.hypot(a, b) ** 2) / (2 * 16 * 16))
    }
    weight[p] = v * Math.min(1, (prob[p]! / 255 - 0.5) * 4)
    if (v > 0.6) {
      strong++
      yMean += luminanceOf(rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!)
    }
  }
  yMean /= Math.max(strong, 1)
  const paintShare = strong / idx.length

  if (paintChroma <= COLOURED_CHROMA && c[0] < 45) return { status: 'skip', reason: 'dark_neutral', bodyArea }
  if (paintShare < MIN_PAINT_SHARE || yMean <= 0) return { status: 'skip', reason: 'low_coverage', bodyArea }

  const blurred = gaussianBlur(weight, w, h, BLUR_SIGMA)
  const mask = new Uint8Array(N * 4)
  const Ls: number[] = []
  const As: number[] = []
  const Bs: number[] = []
  for (let i = 0; i < N; i++) {
    const al = Math.min(1, Math.max(0, blurred[i]!))
    const g = luminanceOf(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!) / yMean
    const shade = Math.round(Math.min(g, SHADE_MAX) * SHADE_SCALE)
    mask[i * 4] = mask[i * 4 + 1] = mask[i * 4 + 2] = shade
    mask[i * 4 + 3] = Math.round(al * 255)
    if (al > 140 / 255) {
      const q = rgbToLab(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!)
      Ls.push(q[0])
      As.push(q[1])
      Bs.push(q[2])
    }
  }
  if (!Ls.length) return { status: 'skip', reason: 'low_coverage', bodyArea }
  const bodyLab: Lab = [median(Ls), median(As), median(Bs)]
  return { status: 'ok', bucket: paintBucketOf(bodyLab), lab: bodyLab, paintLab: c, bodyArea, paintShare, mask }
}

/**
 * Recolour: `out = target * g^0.9`, specular highlights (g above about 1.6) blend to white, composited by the mask alpha.
 * The web canvas does the same per pixel; here it feeds the CLI preview and tests. Returns a new RGB buffer.
 */
export function applyPaint(rgb: Uint8Array, mask: Uint8Array, target: VehicleColor | string): Uint8Array {
  const hex = target in PAINT_HEX ? PAINT_HEX[target as VehicleColor] : target
  const t = hexToRgb(hex).map(srgbToLinear)
  const out = Uint8Array.from(rgb)
  const N = rgb.length / 3
  for (let i = 0; i < N; i++) {
    const al = mask[i * 4 + 3]! / 255
    if (al < 0.01) continue
    const g = mask[i * 4]! / SHADE_SCALE
    const hl = Math.min(1, Math.max(0, (g - 1.6) / 1.4))
    for (let k = 0; k < 3; k++) {
      const v = Math.min(1, t[k]! * g ** 0.9) * (1 - hl) + hl * Math.min(1, 0.5 + 0.25 * g)
      out[i * 3 + k] = Math.round(rgb[i * 3 + k]! * (1 - al) + linearToSrgb(v) * al)
    }
  }
  return out
}
