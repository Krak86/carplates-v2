import { VEHICLE_COLORS, type VehicleColor } from './vehicleColor.js'

/**
 * Paint tones for the wiki photo colour filter. `VEHICLE_COLOR_HEX` is a mid-tone icon swatch; recolouring a photo needs
 * the colour of a car body in daylight (prototype values, tune by eye).
 */
export const PAINT_HEX: Readonly<Record<VehicleColor, string>> = {
  white: '#f2f2f2',
  gray: '#7d8085',
  black: '#17181a',
  blue: '#1f4fb4',
  red: '#c4161c',
  green: '#2e7d32',
  beige: '#cbb896',
  brown: '#5b3a24',
  yellow: '#f2c200',
  orange: '#f07a10',
  purple: '#6a2fa0'
}

export type Rgb = readonly [number, number, number]
/** CIE L*a*b* (D65), `[L, a, b]`. */
export type Lab = readonly [number, number, number]

/** Lightness weight in `paintDeltaE`: body lightness varies a lot with light and angle, hue matters more. */
export const PAINT_LIGHTNESS_WEIGHT = 0.6
/** A photo whose body is within this distance of the target colour keeps its original paint (22 was too loose). */
export const CLOSE_PAINT_DELTA_E = 13

/** sRGB channel (0-255) to linear light (0-1). */
export function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** Linear light (0-1) to an sRGB channel (0-255, unrounded). */
export function linearToSrgb(c: number): number {
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
}

/** Relative luminance (0-1) of an sRGB pixel. */
export function luminanceOf(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m?.[1]) throw new Error(`Invalid hex colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** Lab of a `#rrggbb` string or an `[r, g, b]` triple (0-255). */
export function labOf(color: string | Rgb): Lab {
  const [r, g, b] = typeof color === 'string' ? hexToRgb(color) : color
  return rgbToLab(r, g, b)
}

const PAINT_LAB: Readonly<Record<VehicleColor, Lab>> = Object.fromEntries(
  VEHICLE_COLORS.map(color => [color, labOf(PAINT_HEX[color])])
) as Record<VehicleColor, Lab>

/** Colour distance with the lightness term down-weighted (`PAINT_LIGHTNESS_WEIGHT`). */
export function paintDeltaE(p: Lab, q: Lab): number {
  return Math.hypot((p[0] - q[0]) * PAINT_LIGHTNESS_WEIGHT, p[1] - q[1], p[2] - q[2])
}

/** Nearest of the 11 registry colours to a Lab value. */
export function paintBucketOf(lab: Lab): VehicleColor {
  let best: VehicleColor = VEHICLE_COLORS[0]
  let bestD = Infinity
  for (const color of VEHICLE_COLORS) {
    const d = paintDeltaE(lab, PAINT_LAB[color])
    if (d < bestD) {
      bestD = d
      best = color
    }
  }
  return best
}

/** True when a body of Lab `lab` already reads as `target`: same bucket, or closer than `CLOSE_PAINT_DELTA_E`. */
export function isClosePaint(lab: Lab, target: VehicleColor): boolean {
  return paintBucketOf(lab) === target || paintDeltaE(lab, PAINT_LAB[target]) < CLOSE_PAINT_DELTA_E
}
