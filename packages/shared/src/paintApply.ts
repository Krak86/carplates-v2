import { PAINT_HEX, hexToRgb, linearToSrgb, srgbToLinear } from './paintColor.js'
import type { VehicleColor } from './vehicleColor.js'

/**
 * Recolour maths of the wiki photo colour filter (docs/wiki-recolor-plan.md). The scan (`scripts/src/wiki-paint-core.ts`)
 * writes the mask, the web canvas and the CLI preview read it with these functions, so there is one version of the maths.
 * Mask contract: RGBA at the scan size, RGB = shading `min(g, SHADE_MAX) * SHADE_SCALE`, A = paint weight.
 */
export const SHADE_MAX = 3
export const SHADE_SCALE = 255 / SHADE_MAX

export type LinearRgb = readonly [number, number, number]

/** A target colour (registry colour name or `#rrggbb`) as linear light, computed once per recolour. */
export function paintTargetLinear(target: VehicleColor | string): LinearRgb {
  const hex = target in PAINT_HEX ? PAINT_HEX[target as VehicleColor] : target
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear)
  return [r!, g!, b!]
}

/**
 * The painted tone of one pixel (sRGB 0-255, unrounded): `target * g^0.9`, specular highlights (g above about 1.6) blend to
 * white. Composite it over the photo with the mask alpha: `photo * (1 - a) + tone * a`.
 */
export function paintTone(shadeByte: number, target: LinearRgb, k: 0 | 1 | 2): number {
  const g = shadeByte / SHADE_SCALE
  const hl = Math.min(1, Math.max(0, (g - 1.6) / 1.4))
  return linearToSrgb(Math.min(1, target[k] * g ** 0.9) * (1 - hl) + hl * Math.min(1, 0.5 + 0.25 * g))
}

/** Whole-image recolour (CLI preview, tests). `rgb` is 3 bytes per pixel, `mask` the RGBA mask at the same size. Returns a new buffer. */
export function applyPaint(rgb: Uint8Array, mask: Uint8Array, target: VehicleColor | string): Uint8Array {
  const t = paintTargetLinear(target)
  const out = Uint8Array.from(rgb)
  const N = rgb.length / 3
  for (let i = 0; i < N; i++) {
    const al = mask[i * 4 + 3]! / 255
    if (al < 0.01) continue
    for (const k of [0, 1, 2] as const) {
      out[i * 3 + k] = Math.round(rgb[i * 3 + k]! * (1 - al) + paintTone(mask[i * 4]!, t, k) * al)
    }
  }
  return out
}
