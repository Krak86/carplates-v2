import type { SizeShape } from '@/components/size/VehicleSize.helpers'

/**
 * Original hand-drawn side views in a unit box (x 0 = rear … 1 = front, y 0 = roof … 1 = ground), scaled to the real
 * length x height by `SideSilhouette`. The outline runs down to the sill; the wheel arches are cut out at the real axle
 * positions at draw time, so the same outline fits any wheelbase.
 */
const SEDAN =
  'M0.012 0.885 L0.004 0.7 C0 0.58 0.004 0.54 0.03 0.525 L0.215 0.465 C0.27 0.46 0.31 0.2 0.4 0.06 C0.43 0.025 0.47 0.02 0.52 0.02 L0.58 0.02 C0.62 0.02 0.65 0.03 0.68 0.06 C0.72 0.14 0.75 0.28 0.785 0.405 C0.84 0.43 0.9 0.46 0.95 0.5 C0.99 0.53 1 0.6 1 0.7 L0.994 0.885 Z'

export const SIDE_PATHS: Readonly<Record<SizeShape, string>> = {
  car: SEDAN,
  hatch:
    'M0.012 0.885 L0.004 0.66 C0 0.5 0.012 0.35 0.04 0.22 C0.06 0.12 0.075 0.07 0.1 0.045 C0.13 0.025 0.18 0.02 0.25 0.02 L0.52 0.02 C0.58 0.02 0.64 0.04 0.68 0.08 C0.72 0.15 0.75 0.28 0.785 0.41 C0.84 0.435 0.9 0.46 0.95 0.5 C0.985 0.53 1 0.6 1 0.7 L0.994 0.885 Z',
  sedan: SEDAN,
  wagon:
    'M0.012 0.885 L0.004 0.62 C0 0.45 0.008 0.28 0.025 0.16 C0.035 0.08 0.05 0.04 0.08 0.03 L0.12 0.02 L0.56 0.02 C0.62 0.02 0.67 0.04 0.7 0.09 C0.73 0.16 0.76 0.28 0.79 0.41 C0.84 0.435 0.9 0.46 0.95 0.5 C0.985 0.53 1 0.6 1 0.7 L0.994 0.885 Z',
  coupe:
    'M0.012 0.88 L0.004 0.66 C0 0.58 0.01 0.54 0.04 0.52 L0.2 0.47 C0.25 0.45 0.29 0.36 0.35 0.22 C0.39 0.12 0.43 0.06 0.49 0.04 C0.53 0.025 0.58 0.025 0.62 0.04 C0.66 0.06 0.69 0.1 0.73 0.18 C0.76 0.25 0.79 0.33 0.82 0.4 C0.88 0.43 0.93 0.47 0.965 0.51 C0.99 0.54 1 0.6 1 0.7 L0.994 0.88 Z',
  suv: 'M0.012 0.9 L0.004 0.66 C0 0.45 0.006 0.3 0.02 0.2 C0.03 0.1 0.045 0.05 0.075 0.03 L0.11 0.02 L0.58 0.02 C0.64 0.02 0.69 0.045 0.72 0.1 C0.75 0.17 0.78 0.28 0.805 0.4 C0.85 0.42 0.91 0.45 0.955 0.49 C0.99 0.52 1 0.6 1 0.72 L0.994 0.9 Z',
  mpv: 'M0.012 0.89 L0.004 0.62 C0 0.42 0.006 0.28 0.02 0.18 C0.03 0.09 0.05 0.04 0.085 0.03 L0.13 0.02 L0.56 0.02 C0.62 0.02 0.67 0.05 0.7 0.1 C0.74 0.18 0.78 0.3 0.82 0.44 C0.87 0.46 0.92 0.49 0.96 0.53 C0.99 0.56 1 0.62 1 0.72 L0.994 0.89 Z',
  van: 'M0.012 0.9 L0.004 0.1 Q0.004 0.03 0.04 0.025 L0.7 0.02 C0.76 0.02 0.8 0.04 0.83 0.1 C0.86 0.17 0.89 0.3 0.915 0.44 C0.95 0.46 0.985 0.5 0.995 0.56 C1 0.6 1 0.66 1 0.74 L0.994 0.9 Z',
  pickup:
    'M0.012 0.89 L0.004 0.46 L0.01 0.42 L0.36 0.42 L0.37 0.32 C0.385 0.1 0.4 0.05 0.44 0.03 L0.5 0.02 L0.64 0.02 C0.69 0.03 0.72 0.07 0.745 0.14 C0.77 0.22 0.79 0.32 0.81 0.42 L0.93 0.45 C0.985 0.47 1 0.54 1 0.66 L0.994 0.89 Z',
  moto: 'M0.06 0.42 C0.08 0.38 0.14 0.38 0.22 0.39 L0.44 0.4 L0.5 0.3 C0.55 0.26 0.62 0.27 0.66 0.3 L0.7 0.2 L0.73 0.08 L0.79 0.12 L0.77 0.28 L0.74 0.34 L0.78 0.5 L0.72 0.58 L0.62 0.62 L0.6 0.74 L0.4 0.76 L0.34 0.62 L0.28 0.52 L0.16 0.5 L0.1 0.47 Z',
  bus: 'M0.004 0.88 L0 0.12 C0 0.05 0.01 0.02 0.04 0.02 L0.94 0.02 C0.975 0.02 0.99 0.04 0.995 0.1 L1 0.62 C1 0.7 1 0.78 0.997 0.88 Z',
  truck:
    'M0.004 0.86 L0 0.04 Q0 0 0.02 0 L0.655 0 Q0.665 0 0.665 0.03 L0.665 0.14 L0.7 0.12 L0.84 0.12 C0.87 0.12 0.89 0.15 0.9 0.2 L0.93 0.42 L0.965 0.46 Q0.99 0.5 1 0.56 L1 0.84 Q1 0.88 0.99 0.88 Z'
}

/** The side windows, one sub-path per pane so the pillars show as gaps. None for boxes without glass. */
export const GLASS_PATHS: Readonly<Partial<Record<SizeShape, string>>> = {
  car: 'M0.32 0.395 C0.34 0.3 0.365 0.19 0.392 0.105 L0.463 0.095 L0.463 0.395 Z M0.5 0.395 L0.5 0.09 L0.6 0.09 C0.65 0.09 0.68 0.11 0.7 0.17 L0.745 0.395 Z',
  hatch:
    'M0.135 0.395 L0.15 0.1 L0.44 0.095 L0.44 0.395 Z M0.48 0.395 L0.48 0.095 L0.58 0.095 C0.63 0.095 0.66 0.11 0.68 0.15 L0.745 0.395 Z',
  sedan:
    'M0.32 0.395 C0.34 0.3 0.365 0.19 0.392 0.105 L0.463 0.095 L0.463 0.395 Z M0.5 0.395 L0.5 0.09 L0.6 0.09 C0.65 0.09 0.68 0.11 0.7 0.17 L0.745 0.395 Z',
  wagon:
    'M0.075 0.39 L0.085 0.1 L0.3 0.095 L0.3 0.39 Z M0.335 0.39 L0.335 0.095 L0.46 0.095 L0.46 0.39 Z M0.495 0.39 L0.495 0.095 L0.585 0.095 C0.63 0.095 0.66 0.11 0.69 0.16 L0.75 0.39 Z',
  coupe: 'M0.37 0.425 C0.39 0.3 0.42 0.17 0.47 0.115 L0.585 0.1 C0.63 0.105 0.66 0.14 0.69 0.2 L0.775 0.405 Z',
  suv: 'M0.085 0.37 L0.09 0.1 L0.31 0.095 L0.31 0.37 Z M0.34 0.37 L0.34 0.095 L0.47 0.095 L0.47 0.37 Z M0.5 0.37 L0.5 0.095 L0.6 0.095 C0.65 0.095 0.68 0.12 0.7 0.17 L0.765 0.37 Z',
  mpv: 'M0.09 0.41 L0.1 0.1 L0.3 0.095 L0.3 0.41 Z M0.33 0.41 L0.33 0.095 L0.5 0.095 L0.5 0.41 Z M0.53 0.41 L0.53 0.095 L0.6 0.095 C0.64 0.095 0.67 0.12 0.69 0.17 L0.78 0.41 Z',
  van: 'M0.7 0.42 L0.72 0.1 L0.77 0.1 C0.8 0.11 0.82 0.15 0.835 0.2 L0.9 0.42 Z',
  pickup:
    'M0.395 0.38 L0.415 0.1 L0.5 0.095 L0.5 0.38 Z M0.53 0.38 L0.53 0.095 L0.63 0.095 C0.67 0.1 0.7 0.12 0.715 0.17 L0.775 0.38 Z',
  bus: 'M0.03 0.14 H0.125 V0.5 H0.03 Z M0.14 0.14 H0.235 V0.5 H0.14 Z M0.25 0.14 H0.345 V0.5 H0.25 Z M0.36 0.14 H0.455 V0.5 H0.36 Z M0.52 0.14 H0.615 V0.5 H0.52 Z M0.63 0.14 H0.725 V0.5 H0.63 Z M0.74 0.14 H0.835 V0.5 H0.74 Z M0.945 0.12 L0.985 0.12 L0.992 0.5 L0.945 0.5 Z',
  truck: 'M0.72 0.4 L0.72 0.16 L0.835 0.16 C0.86 0.16 0.875 0.19 0.885 0.24 L0.915 0.4 Z'
}

/** Door seams, handles and panel lines: thin strokes drawn over the body. */
export const DETAIL_PATHS: Readonly<Record<SizeShape, string>> = {
  car: 'M0.3 0.43 V0.85 M0.485 0.4 V0.85 M0.75 0.4 L0.745 0.85 M0.43 0.46 H0.465 M0.68 0.46 H0.715',
  hatch: 'M0.46 0.4 V0.85 M0.75 0.4 L0.745 0.85 M0.4 0.46 H0.435 M0.66 0.46 H0.695 M0.17 0.4 V0.85',
  sedan: 'M0.3 0.43 V0.85 M0.485 0.4 V0.85 M0.75 0.4 L0.745 0.85 M0.43 0.46 H0.465 M0.68 0.46 H0.715',
  wagon: 'M0.32 0.4 V0.85 M0.48 0.4 V0.85 M0.76 0.4 L0.755 0.85 M0.43 0.46 H0.46 M0.69 0.46 H0.72',
  coupe: 'M0.35 0.43 L0.34 0.84 M0.79 0.4 L0.785 0.84 M0.42 0.46 H0.46',
  suv: 'M0.325 0.38 V0.85 M0.485 0.38 V0.85 M0.775 0.4 L0.77 0.85 M0.43 0.45 H0.46 M0.7 0.45 H0.73 M0.11 0.0 H0.58',
  mpv: 'M0.315 0.41 V0.85 M0.515 0.41 V0.85 M0.79 0.43 L0.785 0.85 M0.43 0.5 H0.46 M0.72 0.5 H0.75',
  van: 'M0.36 0.1 V0.85 M0.66 0.42 V0.85 M0.71 0.1 V0.85 M0.1 0.6 H0.34 M0.74 0.5 H0.77',
  pickup: 'M0.36 0.42 V0.85 M0.52 0.38 V0.85 M0.79 0.42 L0.785 0.85 M0.03 0.5 H0.34 M0.46 0.46 H0.49',
  moto: 'M0.74 0.3 L0.86 0.73 M0.38 0.68 L0.17 0.73 M0.46 0.46 H0.58',
  bus: 'M0.46 0.1 V0.85 M0.5 0.1 V0.85 M0.855 0.1 V0.85 M0.9 0.1 V0.85 M0.01 0.62 H0.99',
  truck: 'M0.13 0.04 V0.8 M0.26 0.04 V0.8 M0.39 0.04 V0.8 M0.52 0.04 V0.8 M0.01 0.8 H0.66 M0.72 0.46 H0.745'
}

/** Headlamp and tail-lamp shapes (filled). */
export const LIGHT_PATHS: Readonly<Record<SizeShape, { head: string; tail: string }>> = {
  car: {
    head: 'M0.945 0.52 C0.975 0.535 0.993 0.56 0.998 0.6 L0.997 0.63 L0.94 0.585 Z',
    tail: 'M0.003 0.6 C0.003 0.56 0.012 0.54 0.03 0.53 L0.05 0.535 L0.02 0.61 Z'
  },
  hatch: {
    head: 'M0.945 0.53 C0.975 0.54 0.993 0.565 0.998 0.6 L0.997 0.63 L0.94 0.59 Z',
    tail: 'M0.004 0.5 L0.012 0.36 L0.03 0.34 L0.022 0.48 Z'
  },
  sedan: {
    head: 'M0.945 0.52 C0.975 0.535 0.993 0.56 0.998 0.6 L0.997 0.63 L0.94 0.585 Z',
    tail: 'M0.003 0.6 C0.003 0.56 0.012 0.54 0.03 0.53 L0.05 0.535 L0.02 0.61 Z'
  },
  wagon: {
    head: 'M0.945 0.53 C0.975 0.54 0.993 0.565 0.998 0.6 L0.997 0.63 L0.94 0.59 Z',
    tail: 'M0.004 0.5 L0.006 0.32 L0.02 0.3 L0.02 0.48 Z'
  },
  coupe: {
    head: 'M0.95 0.525 C0.978 0.54 0.994 0.565 0.998 0.6 L0.997 0.63 L0.945 0.59 Z',
    tail: 'M0.003 0.6 C0.003 0.56 0.015 0.54 0.04 0.53 L0.06 0.535 L0.02 0.61 Z'
  },
  suv: {
    head: 'M0.95 0.5 C0.98 0.52 0.995 0.56 0.998 0.62 L0.997 0.66 L0.945 0.6 Z',
    tail: 'M0.004 0.52 L0.006 0.3 L0.02 0.28 L0.02 0.5 Z'
  },
  mpv: {
    head: 'M0.955 0.545 C0.98 0.56 0.995 0.585 0.998 0.62 L0.997 0.65 L0.95 0.61 Z',
    tail: 'M0.004 0.5 L0.006 0.3 L0.022 0.28 L0.022 0.48 Z'
  },
  van: {
    head: 'M0.96 0.56 C0.985 0.57 0.997 0.59 0.999 0.62 L0.998 0.66 L0.955 0.62 Z',
    tail: 'M0.004 0.6 L0.004 0.35 L0.018 0.35 L0.018 0.6 Z'
  },
  pickup: {
    head: 'M0.95 0.48 C0.978 0.495 0.995 0.52 0.998 0.56 L0.997 0.6 L0.945 0.56 Z',
    tail: 'M0.004 0.52 L0.004 0.44 L0.016 0.44 L0.016 0.52 Z'
  },
  moto: { head: 'M0.76 0.12 L0.8 0.14 L0.79 0.22 L0.76 0.2 Z', tail: 'M0.05 0.42 L0.08 0.4 L0.09 0.46 L0.06 0.47 Z' },
  bus: {
    head: 'M0.97 0.6 H0.998 V0.7 H0.97 Z',
    tail: 'M0.002 0.5 H0.012 V0.62 H0.002 Z'
  },
  truck: {
    head: 'M0.975 0.5 H0.999 V0.58 H0.975 Z',
    tail: 'M0.002 0.7 H0.012 V0.8 H0.002 Z'
  }
}

/** The mirror stalk + housing on the front door: a small filled shape. */
export const MIRROR_PATHS: Readonly<Partial<Record<SizeShape, string>>> = {
  car: 'M0.74 0.39 Q0.74 0.34 0.775 0.345 L0.785 0.39 Z',
  hatch: 'M0.74 0.39 Q0.74 0.34 0.775 0.345 L0.785 0.39 Z',
  sedan: 'M0.74 0.39 Q0.74 0.34 0.775 0.345 L0.785 0.39 Z',
  wagon: 'M0.745 0.39 Q0.745 0.34 0.78 0.345 L0.79 0.39 Z',
  coupe: 'M0.77 0.39 Q0.77 0.34 0.805 0.345 L0.815 0.39 Z',
  suv: 'M0.76 0.38 Q0.76 0.33 0.795 0.335 L0.805 0.38 Z',
  mpv: 'M0.775 0.4 Q0.775 0.35 0.81 0.355 L0.82 0.4 Z',
  van: 'M0.85 0.4 Q0.85 0.34 0.89 0.345 L0.9 0.4 Z',
  pickup: 'M0.765 0.36 Q0.765 0.31 0.8 0.315 L0.81 0.36 Z',
  truck: 'M0.9 0.3 Q0.9 0.24 0.94 0.245 L0.95 0.3 Z'
}

export const TAIL_COLOR = '#d4372c'
/** Fixed, not themed: a tyre is dark and a rim is metal in both light and dark mode. */
export const TYRE_COLOR = '#23262b'
export const RIM_COLOR = '#c9ced6'
export const SPOKE_COLOR = '#6b717b'
export const LAMP_COLOR = '#f1eed6'

/** Wheel diameter (mm) per shape. */
export const WHEEL_MM: Readonly<Record<SizeShape, number>> = {
  car: 640,
  hatch: 620,
  sedan: 660,
  wagon: 660,
  coupe: 660,
  suv: 730,
  mpv: 680,
  van: 700,
  pickup: 780,
  moto: 620,
  bus: 1000,
  truck: 1000
}

/** Wheel-arch radius as a share of the wheel radius; a motorcycle's wheels run free, so 0 (no cut-out). */
export const ARCH_SHARE: Readonly<Record<SizeShape, number>> = {
  car: 1.2,
  hatch: 1.2,
  sedan: 1.2,
  wagon: 1.2,
  coupe: 1.18,
  suv: 1.2,
  mpv: 1.2,
  van: 1.18,
  pickup: 1.2,
  moto: 0,
  bus: 1.16,
  truck: 1.16
}

/** The share of the overhang (length - wheelbase) that sits in front of the front axle. */
export const FRONT_OVERHANG_SHARE: Readonly<Record<SizeShape, number>> = {
  car: 0.47,
  hatch: 0.48,
  sedan: 0.47,
  wagon: 0.47,
  coupe: 0.45,
  suv: 0.46,
  mpv: 0.46,
  van: 0.4,
  pickup: 0.45,
  moto: 0.45,
  bus: 0.35,
  truck: 0.35
}

/** Wheelbase share of the length when no figure is known. */
const DEFAULT_WHEELBASE_SHARE = 0.6

/** Axle positions in mm from the rear bumper: the front axle sits at its overhang share, the rear one a wheelbase behind. */
export function axlePositions(
  shape: SizeShape,
  lengthMm: number,
  wheelbaseMm: number | null
): { rear: number; front: number } {
  const wheelbase = wheelbaseMm ?? lengthMm * DEFAULT_WHEELBASE_SHARE
  const front = lengthMm - (lengthMm - wheelbase) * FRONT_OVERHANG_SHARE[shape]
  return { rear: front - wheelbase, front }
}

/** A size to draw a shape at when the caller has no figures (the guides' decorative silhouettes). */
export const DRAW_TYPICAL: Readonly<Record<SizeShape, { lengthMm: number; heightMm: number; wheelbaseMm: number }>> = {
  car: { lengthMm: 4500, heightMm: 1500, wheelbaseMm: 2700 },
  hatch: { lengthMm: 4200, heightMm: 1470, wheelbaseMm: 2600 },
  sedan: { lengthMm: 4650, heightMm: 1450, wheelbaseMm: 2750 },
  wagon: { lengthMm: 4650, heightMm: 1470, wheelbaseMm: 2740 },
  coupe: { lengthMm: 4500, heightMm: 1350, wheelbaseMm: 2680 },
  suv: { lengthMm: 4500, heightMm: 1650, wheelbaseMm: 2700 },
  mpv: { lengthMm: 4500, heightMm: 1680, wheelbaseMm: 2750 },
  van: { lengthMm: 4900, heightMm: 1950, wheelbaseMm: 3000 },
  pickup: { lengthMm: 5300, heightMm: 1800, wheelbaseMm: 3200 },
  moto: { lengthMm: 2100, heightMm: 1150, wheelbaseMm: 1450 },
  bus: { lengthMm: 12000, heightMm: 3000, wheelbaseMm: 6000 },
  truck: { lengthMm: 7500, heightMm: 3300, wheelbaseMm: 4200 }
}

export type TopLayout = {
  /** Glass-house start / end as shares of the length (rear -> front). */
  cabin: readonly [number, number]
  /** How far the rear / front corners are pulled in, as shares of the width (a van is nearly square). */
  tail: number
  nose: number
}

/** The top-view body is a tapered outline with a glass-house; shapes differ in where the cabin sits and how pointed they are. */
export const TOP_LAYOUT: Readonly<Record<SizeShape, TopLayout>> = {
  car: { cabin: [0.28, 0.68], tail: 0.14, nose: 0.2 },
  hatch: { cabin: [0.22, 0.7], tail: 0.1, nose: 0.2 },
  sedan: { cabin: [0.3, 0.66], tail: 0.14, nose: 0.2 },
  wagon: { cabin: [0.16, 0.7], tail: 0.08, nose: 0.2 },
  coupe: { cabin: [0.34, 0.66], tail: 0.16, nose: 0.22 },
  suv: { cabin: [0.16, 0.68], tail: 0.08, nose: 0.17 },
  mpv: { cabin: [0.14, 0.7], tail: 0.07, nose: 0.17 },
  van: { cabin: [0.56, 0.84], tail: 0.04, nose: 0.1 },
  pickup: { cabin: [0.42, 0.7], tail: 0.05, nose: 0.15 },
  moto: { cabin: [0.3, 0.6], tail: 0.4, nose: 0.4 },
  bus: { cabin: [0.04, 0.96], tail: 0.03, nose: 0.04 },
  truck: { cabin: [0.8, 0.96], tail: 0.03, nose: 0.06 }
}

/** The top-view outline in a unit box (x rear -> front, y across), pulled in at the corners by `tail` / `nose`. */
export function topPath({ tail, nose }: Pick<TopLayout, 'tail' | 'nose'>): string {
  const flip = (y: number): number => 1 - y
  return [
    `M0.03 ${tail}`,
    `C0.045 ${tail * 0.35} 0.1 0 0.2 0`,
    'L0.72 0',
    `C0.86 0 0.96 ${nose * 0.45} 0.99 ${nose}`,
    `Q1 0.5 0.99 ${flip(nose)}`,
    `C0.96 ${flip(nose * 0.45)} 0.86 1 0.72 1`,
    'L0.2 1',
    `C0.1 1 0.045 ${flip(tail * 0.35)} 0.03 ${flip(tail)}`,
    `Q0.01 0.5 0.03 ${tail}`,
    'Z'
  ].join(' ')
}
