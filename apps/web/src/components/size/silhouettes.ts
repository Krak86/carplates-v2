import type { SizeShape } from '@/components/size/VehicleSize.helpers'

/**
 * Side outlines in a unit box (x 0 = rear … 1 = front, y 0 = roof … 1 = ground), scaled to the real length x height by
 * the schema. The body stops above the ground; the wheels are drawn separately at the real axle positions.
 */
export const SIDE_PATHS: Readonly<Record<SizeShape, string>> = {
  car: 'M0.01 0.86 L0 0.60 Q0 0.50 0.05 0.48 L0.22 0.44 Q0.28 0.18 0.37 0.07 Q0.41 0.02 0.5 0.02 L0.58 0.02 Q0.66 0.04 0.72 0.2 L0.79 0.42 L0.95 0.5 Q1 0.56 1 0.68 L0.99 0.86 Z',
  hatch:
    'M0.01 0.86 L0 0.6 Q0 0.48 0.04 0.4 L0.11 0.12 Q0.14 0.03 0.24 0.02 L0.55 0.02 Q0.65 0.04 0.72 0.22 L0.8 0.44 L0.95 0.52 Q1 0.58 1 0.7 L0.99 0.86 Z',
  sedan:
    'M0.01 0.86 L0 0.62 Q0 0.54 0.05 0.53 L0.24 0.46 Q0.3 0.2 0.38 0.08 Q0.42 0.02 0.5 0.02 L0.58 0.02 Q0.66 0.03 0.72 0.2 L0.78 0.4 L0.95 0.5 Q1 0.55 1 0.68 L0.99 0.86 Z',
  wagon:
    'M0.01 0.86 L0 0.55 Q0 0.4 0.03 0.3 L0.05 0.1 Q0.07 0.03 0.15 0.02 L0.58 0.02 Q0.67 0.04 0.73 0.22 L0.8 0.44 L0.95 0.52 Q1 0.58 1 0.7 L0.99 0.86 Z',
  coupe:
    'M0.01 0.84 L0 0.6 Q0 0.5 0.05 0.48 L0.28 0.44 Q0.36 0.12 0.46 0.04 Q0.5 0.02 0.56 0.02 Q0.64 0.04 0.72 0.22 L0.8 0.42 L0.96 0.52 Q1 0.58 1 0.7 L0.99 0.84 Z',
  suv: 'M0.01 0.9 L0 0.55 Q0 0.3 0.03 0.22 L0.07 0.08 Q0.09 0.02 0.16 0.02 L0.6 0.02 Q0.68 0.03 0.74 0.2 L0.8 0.42 L0.96 0.48 Q1 0.54 1 0.68 L0.99 0.9 Z',
  mpv: 'M0.01 0.88 L0 0.5 Q0 0.3 0.03 0.2 L0.08 0.06 Q0.1 0.02 0.18 0.02 L0.58 0.02 Q0.66 0.04 0.72 0.22 L0.82 0.46 L0.96 0.52 Q1 0.58 1 0.7 L0.99 0.88 Z',
  van: 'M0.01 0.9 L0 0.06 Q0 0.02 0.04 0.02 L0.74 0.02 Q0.8 0.03 0.84 0.14 L0.92 0.42 L0.97 0.5 Q1 0.56 1 0.7 L0.99 0.9 Z',
  pickup:
    'M0.01 0.88 L0 0.42 L0.38 0.42 L0.4 0.3 Q0.43 0.04 0.52 0.02 L0.68 0.02 Q0.74 0.04 0.78 0.22 L0.84 0.42 L0.96 0.46 Q1 0.52 1 0.66 L0.99 0.88 Z',
  moto: 'M0.2 0.6 L0.25 0.38 L0.5 0.33 L0.62 0.14 L0.74 0.02 L0.8 0.3 L0.78 0.6 L0.6 0.74 L0.3 0.74 Z',
  bus: 'M0 0.9 L0 0.04 Q0 0.02 0.02 0.02 L0.96 0.02 Q1 0.03 1 0.1 L1 0.9 Z',
  truck:
    'M0 0.9 L0 0.06 Q0 0.02 0.03 0.02 L0.66 0.02 L0.66 0.3 L0.78 0.3 Q0.82 0.04 0.9 0.02 L0.96 0.02 Q1 0.04 1 0.14 L1 0.9 Z'
}

/** The side-window cut-outs in the same unit box (a lighter shape inside the body); none for boxes without glass. */
export const GLASS_PATHS: Readonly<Partial<Record<SizeShape, string>>> = {
  car: 'M0.3 0.42 Q0.34 0.2 0.4 0.1 L0.58 0.1 Q0.64 0.12 0.68 0.24 L0.72 0.42 Z',
  hatch: 'M0.15 0.4 L0.2 0.14 L0.55 0.1 Q0.62 0.12 0.67 0.26 L0.71 0.42 Z',
  sedan: 'M0.3 0.43 Q0.34 0.22 0.41 0.1 L0.58 0.1 Q0.64 0.12 0.68 0.24 L0.72 0.43 Z',
  wagon: 'M0.1 0.4 L0.12 0.12 L0.58 0.1 Q0.64 0.12 0.69 0.26 L0.73 0.42 Z',
  coupe: 'M0.34 0.4 Q0.4 0.16 0.47 0.08 L0.56 0.08 Q0.62 0.1 0.68 0.24 L0.72 0.4 Z',
  suv: 'M0.12 0.4 L0.14 0.12 L0.6 0.1 Q0.66 0.12 0.7 0.24 L0.74 0.4 Z',
  mpv: 'M0.1 0.42 L0.14 0.12 L0.58 0.1 Q0.64 0.12 0.7 0.26 L0.76 0.44 Z',
  van: 'M0.66 0.4 L0.7 0.1 L0.76 0.1 Q0.8 0.12 0.83 0.2 L0.89 0.4 Z',
  pickup: 'M0.46 0.38 L0.5 0.1 L0.66 0.1 Q0.7 0.12 0.74 0.24 L0.78 0.38 Z',
  bus: 'M0.04 0.12 L0.94 0.12 L0.96 0.46 L0.04 0.46 Z',
  truck: 'M0.82 0.4 Q0.84 0.12 0.9 0.1 L0.94 0.1 Q0.96 0.12 0.97 0.4 Z'
}

/** Wheel diameter (mm) per shape; wheel arches are not drawn, the tyre just overlaps the body. */
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

export type TopLayout = {
  /** Glass-house start / end as shares of the length (rear -> front). */
  cabin: readonly [number, number]
  /** Corner radius as a share of the width. */
  radius: number
}

/** The top-view body is a rounded rectangle with a lighter glass-house; shapes differ in where the cabin sits. */
export const TOP_LAYOUT: Readonly<Record<SizeShape, TopLayout>> = {
  car: { cabin: [0.28, 0.68], radius: 0.3 },
  hatch: { cabin: [0.22, 0.7], radius: 0.3 },
  sedan: { cabin: [0.3, 0.66], radius: 0.3 },
  wagon: { cabin: [0.16, 0.7], radius: 0.28 },
  coupe: { cabin: [0.34, 0.66], radius: 0.32 },
  suv: { cabin: [0.16, 0.68], radius: 0.26 },
  mpv: { cabin: [0.14, 0.7], radius: 0.26 },
  van: { cabin: [0.56, 0.84], radius: 0.16 },
  pickup: { cabin: [0.42, 0.7], radius: 0.2 },
  moto: { cabin: [0.3, 0.6], radius: 0.4 },
  bus: { cabin: [0.04, 0.96], radius: 0.06 },
  truck: { cabin: [0.8, 0.96], radius: 0.08 }
}
