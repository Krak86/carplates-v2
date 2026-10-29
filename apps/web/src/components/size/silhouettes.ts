import type { SizeShape } from '@/components/size/VehicleSize.helpers'

/**
 * Side views traced from real side-on photos of each body style, in a unit box (x 0 = rear … 1 = front, y 0 = roof …
 * 1 = ground), scaled to the real length x height by `SideSilhouette`. The outline runs down to the sill; the wheel
 * arches are cut out at the real axle positions at draw time, so the same outline fits any wheelbase. A motorcycle,
 * bus and truck are still hand-drawn.
 */
export const SIDE_PATHS: Readonly<Record<SizeShape, string>> = {
  car: 'M0 0.754 L0 0.5 L0.008 0.36 L0.023 0.281 L0.075 0.272 L0.247 0.053 L0.326 0.018 L0.437 0 L0.504 0.009 L0.589 0.079 L0.717 0.307 L0.787 0.307 L0.895 0.342 L0.985 0.439 L1 0.5 L1 0.746 L0.987 0.833 L0.946 0.895 L0.548 0.895 L0.044 0.895 L0.028 0.868 Z',
  hatch:
    'M0 0.9 L0.01 0.876 L0.052 0.841 L0.065 0.841 L0.07 0.828 L0.039 0.814 L0.01 0.759 L0.003 0.717 L0 0.6 L0.013 0.538 L0.026 0.51 L0.021 0.49 L0.021 0.421 L0.026 0.372 L0.018 0.338 L0.018 0.303 L0.021 0.269 L0.042 0.228 L0.031 0.207 L0.042 0.172 L0.083 0.166 L0.161 0.09 L0.223 0.048 L0.226 0.007 L0.234 0 L0.486 0 L0.548 0.021 L0.582 0.048 L0.6 0.076 L0.595 0.083 L0.6 0.097 L0.662 0.172 L0.686 0.214 L0.704 0.221 L0.704 0.234 L0.714 0.234 L0.727 0.262 L0.849 0.297 L0.857 0.31 L0.93 0.352 L0.971 0.407 L0.984 0.455 L0.984 0.545 L1 0.566 L1 0.793 L0.974 0.834 L0.948 0.855 L0.995 0.89 L1 0.9 L0.47 0.9 Z',
  sedan:
    'M0 0.754 L0 0.5 L0.008 0.36 L0.023 0.281 L0.075 0.272 L0.247 0.053 L0.326 0.018 L0.437 0 L0.504 0.009 L0.589 0.079 L0.717 0.307 L0.787 0.307 L0.895 0.342 L0.985 0.439 L1 0.5 L1 0.746 L0.987 0.833 L0.946 0.895 L0.548 0.895 L0.044 0.895 L0.028 0.868 Z',
  wagon:
    'M0 0.686 L0.02 0.364 L0.045 0.271 L0.043 0.25 L0.056 0.236 L0.084 0.157 L0.093 0.1 L0.086 0.086 L0.088 0.079 L0.133 0.043 L0.325 0 L0.465 0.007 L0.533 0.036 L0.558 0.057 L0.628 0.164 L0.632 0.186 L0.643 0.193 L0.643 0.207 L0.666 0.236 L0.682 0.279 L0.727 0.286 L0.731 0.3 L0.801 0.307 L0.898 0.357 L0.935 0.393 L0.953 0.429 L0.968 0.436 L1 0.507 L0.998 0.857 L0.973 0.886 L0.955 0.9 L0.558 0.9 L0.045 0.9 L0.102 0.871 L0.147 0.871 L0.147 0.85 L0.081 0.829 L0.007 0.779 Z',
  coupe:
    'M0 0.604 L0 0.416 L0.009 0.381 L0.009 0.223 L0.104 0.218 L0.253 0.051 L0.291 0.02 L0.353 0 L0.469 0 L0.528 0.02 L0.56 0.051 L0.666 0.239 L0.76 0.254 L0.863 0.294 L0.931 0.345 L0.984 0.426 L0.985 0.553 L1 0.594 L1 0.66 L0.993 0.675 L0.997 0.701 L0.993 0.731 L1 0.751 L1 0.787 L0.987 0.817 L0.953 0.848 L0.951 0.868 L0.944 0.878 L0.894 0.878 L0.89 0.898 L0.631 0.898 L0.138 0.898 L0.126 0.832 L0.106 0.832 L0.018 0.751 L0.003 0.65 L0.007 0.614 Z',
  suv: 'M0 0.586 L0 0.546 L0.013 0.513 L0.01 0.454 L0.005 0.434 L0.008 0.375 L0.01 0.355 L0.044 0.276 L0.057 0.191 L0.075 0.125 L0.047 0.086 L0.114 0.072 L0.13 0.039 L0.163 0.02 L0.285 0 L0.391 0 L0.469 0.013 L0.516 0.039 L0.544 0.086 L0.598 0.125 L0.65 0.184 L0.72 0.309 L0.87 0.336 L0.922 0.355 L0.961 0.408 L0.982 0.487 L0.984 0.539 L1 0.625 L0.997 0.678 L0.966 0.757 L0.946 0.783 L0.925 0.783 L0.917 0.855 L0.907 0.9 L0.539 0.9 L0.127 0.9 L0.111 0.803 L0.085 0.803 L0.016 0.724 Z',
  mpv: 'M0 0.676 L0.005 0.671 L0.01 0.489 L0.037 0.484 L0.025 0.44 L0.012 0.44 L0.017 0.351 L0.029 0.236 L0.044 0.164 L0.063 0.111 L0.058 0.098 L0.061 0.08 L0.237 0.013 L0.377 0 L0.482 0.018 L0.575 0.062 L0.694 0.191 L0.788 0.32 L0.922 0.431 L0.963 0.489 L0.985 0.564 L1 0.662 L1 0.76 L0.992 0.836 L0.968 0.862 L0.914 0.889 L0.873 0.889 L0.87 0.9 L0.54 0.9 L0.091 0.9 L0.08 0.853 L0.044 0.844 L0.012 0.813 L0.007 0.796 Z',
  van: 'M0 0.731 L0.014 0.674 L0.021 0.28 L0.025 0.259 L0.029 0.114 L0.039 0.021 L0.052 0 L0.623 0 L0.652 0.01 L0.687 0.041 L0.722 0.098 L0.767 0.192 L0.849 0.399 L0.897 0.42 L0.959 0.477 L0.969 0.513 L0.975 0.585 L0.986 0.611 L0.99 0.674 L0.998 0.699 L1 0.793 L0.992 0.85 L0.975 0.876 L0.942 0.881 L0.938 0.9 L0.293 0.9 L0.171 0.9 L0.167 0.881 L0.037 0.881 L0.01 0.85 L0.002 0.808 Z',
  pickup:
    'M0 0.65 L0.002 0.604 L0.014 0.598 L0.019 0.578 L0.007 0.512 L0.002 0.347 L0.012 0.314 L0.016 0.268 L0.044 0.255 L0.146 0.228 L0.445 0.228 L0.45 -0.003 L0.515 -0.003 L0.589 0.017 L0.622 0.044 L0.671 0.109 L0.671 0.123 L0.761 0.268 L0.805 0.274 L0.907 0.321 L0.954 0.354 L0.937 0.36 L0.951 0.38 L0.979 0.38 L0.991 0.433 L0.986 0.439 L0.991 0.459 L0.991 0.479 L0.986 0.485 L0.993 0.499 L0.986 0.518 L1 0.591 L1 0.644 L0.988 0.743 L0.937 0.796 L0.914 0.796 L0.905 0.868 L0.919 0.888 L0.968 0.888 L0.986 0.9 L0.436 0.9 L0.005 0.9 L0.074 0.868 L0.148 0.868 L0.153 0.776 L0.144 0.763 L0.086 0.763 L0.081 0.736 L0.012 0.723 Z',
  moto: 'M0.06 0.42 C0.08 0.38 0.14 0.38 0.22 0.39 L0.44 0.4 L0.5 0.3 C0.55 0.26 0.62 0.27 0.66 0.3 L0.7 0.2 L0.73 0.08 L0.79 0.12 L0.77 0.28 L0.74 0.34 L0.78 0.5 L0.72 0.58 L0.62 0.62 L0.6 0.74 L0.4 0.76 L0.34 0.62 L0.28 0.52 L0.16 0.5 L0.1 0.47 Z',
  bus: 'M0.004 0.88 L0 0.12 C0 0.05 0.01 0.02 0.04 0.02 L0.94 0.02 C0.975 0.02 0.99 0.04 0.995 0.1 L1 0.62 C1 0.7 1 0.78 0.997 0.88 Z',
  truck:
    'M0.004 0.86 L0 0.04 Q0 0 0.02 0 L0.655 0 Q0.665 0 0.665 0.03 L0.665 0.14 L0.7 0.12 L0.84 0.12 C0.87 0.12 0.89 0.15 0.9 0.2 L0.93 0.42 L0.965 0.46 Q0.99 0.5 1 0.56 L1 0.84 Q1 0.88 0.99 0.88 Z'
}

/** The side windows, one sub-path per pane so the pillars show as gaps. None for boxes without glass. */
export const GLASS_PATHS: Readonly<Partial<Record<SizeShape, string>>> = {
  car: 'M0.653 0.235 L0.586 0.116 L0.504 0.047 L0.47 0.044 L0.47 0.333 L0.653 0.333 Z M0.429 0.035 L0.37 0.044 L0.303 0.067 L0.303 0.333 L0.429 0.333 Z M0.285 0.074 L0.252 0.088 L0.237 0.102 L0.237 0.333 L0.285 0.333 Z',
  hatch:
    'M0.662 0.21 L0.613 0.145 L0.579 0.083 L0.545 0.057 L0.47 0.035 L0.47 0.276 L0.662 0.276 Z M0.418 0.035 L0.351 0.035 L0.268 0.054 L0.268 0.276 L0.418 0.276 Z M0.249 0.038 L0.234 0.038 L0.216 0.086 L0.125 0.159 L0.125 0.276 L0.249 0.276 Z',
  sedan:
    'M0.653 0.235 L0.586 0.116 L0.504 0.047 L0.47 0.044 L0.47 0.333 L0.653 0.333 Z M0.429 0.035 L0.37 0.044 L0.303 0.067 L0.303 0.333 L0.429 0.333 Z M0.285 0.074 L0.252 0.088 L0.237 0.102 L0.237 0.333 L0.285 0.333 Z',
  wagon:
    'M0.106 0.101 L0.131 0.082 L0.214 0.056 L0.214 0.293 L0.106 0.293 Z M0.23 0.056 L0.33 0.035 L0.413 0.035 L0.438 0.042 L0.438 0.293 L0.23 0.293 Z M0.46 0.042 L0.519 0.065 L0.56 0.098 L0.643 0.234 L0.652 0.258 L0.686 0.263 L0.686 0.293 L0.46 0.293 Z',
  coupe:
    'M0.259 0.084 L0.293 0.056 L0.343 0.04 L0.343 0.269 L0.259 0.269 Z M0.356 0.035 L0.465 0.035 L0.506 0.045 L0.547 0.075 L0.547 0.269 L0.356 0.269 Z',
  suv: 'M0.655 0.23 L0.596 0.16 L0.547 0.121 L0.513 0.074 L0.479 0.055 L0.479 0.329 L0.655 0.329 Z M0.438 0.042 L0.306 0.035 L0.306 0.329 L0.438 0.329 Z M0.256 0.042 L0.231 0.042 L0.166 0.056 L0.14 0.068 L0.124 0.085 L0.124 0.329 L0.256 0.329 Z',
  mpv: 'M0.682 0.214 L0.565 0.092 L0.514 0.066 L0.457 0.048 L0.457 0.329 L0.682 0.329 Z M0.428 0.044 L0.371 0.035 L0.261 0.044 L0.261 0.329 L0.428 0.329 Z M0.218 0.055 L0.076 0.104 L0.059 0.127 L0.059 0.329 L0.218 0.329 Z',
  van: 'M0.821 0.361 L0.738 0.176 L0.637 0.176 L0.637 0.435 L0.821 0.435 Z',
  pickup: 'M0.501 0.07 L0.61 0.071 L0.633 0.094 L0.675 0.159 L0.675 0.314 L0.501 0.314 Z',
  bus: 'M0.03 0.14 H0.125 V0.5 H0.03 Z M0.14 0.14 H0.235 V0.5 H0.14 Z M0.25 0.14 H0.345 V0.5 H0.25 Z M0.36 0.14 H0.455 V0.5 H0.36 Z M0.52 0.14 H0.615 V0.5 H0.52 Z M0.63 0.14 H0.725 V0.5 H0.63 Z M0.74 0.14 H0.835 V0.5 H0.74 Z M0.945 0.12 L0.985 0.12 L0.992 0.5 L0.945 0.5 Z',
  truck: 'M0.72 0.4 L0.72 0.16 L0.835 0.16 C0.86 0.16 0.875 0.19 0.885 0.24 L0.915 0.4 Z'
}

/** Door seams, handles and panel lines: thin strokes drawn over the body. */
export const DETAIL_PATHS: Readonly<Record<SizeShape, string>> = {
  car: 'M0.717 0.353 V0.884 M0.46 0.353 V0.884 M0.278 0.353 V0.884 M0.495 0.403 H0.46',
  hatch: 'M0.727 0.296 V0.883 M0.455 0.296 V0.883 M0.262 0.296 V0.883 M0.49 0.346 H0.455',
  sedan: 'M0.717 0.353 V0.884 M0.46 0.353 V0.884 M0.278 0.353 V0.884 M0.495 0.403 H0.46',
  wagon: 'M0.221 0.313 V0.88 M0.447 0.313 V0.88 M0.707 0.313 V0.88 M0.412 0.363 H0.447',
  coupe: 'M0.337 0.289 V0.878 M0.646 0.289 V0.878 M0.611 0.339 H0.646',
  suv: 'M0.715 0.349 V0.881 M0.477 0.349 V0.881 M0.282 0.349 V0.881 M0.512 0.399 H0.477',
  mpv: 'M0.699 0.349 V0.882 M0.457 0.349 V0.882 M0.198 0.349 V0.882 M0.492 0.399 H0.457',
  van: 'M0.841 0.455 V0.882 M0.631 0.455 V0.882 M0.666 0.505 H0.631',
  pickup: 'M0.471 0.334 V0.881 M0.742 0.334 V0.881 M0.707 0.384 H0.742',
  moto: 'M0.74 0.3 L0.86 0.73 M0.38 0.68 L0.17 0.73 M0.46 0.46 H0.58',
  bus: 'M0.46 0.1 V0.85 M0.5 0.1 V0.85 M0.855 0.1 V0.85 M0.9 0.1 V0.85 M0.01 0.62 H0.99',
  truck: 'M0.13 0.04 V0.8 M0.26 0.04 V0.8 M0.39 0.04 V0.8 M0.52 0.04 V0.8 M0.01 0.8 H0.66 M0.72 0.46 H0.745'
}

/** Headlamp and tail-lamp shapes (filled). */
export const LIGHT_PATHS: Readonly<Record<SizeShape, { head: string; tail: string }>> = {
  car: {
    head: 'M0.943 0.395 L1 0.535 L0.955 0.535 L0.871 0.395 Z',
    tail: 'M0.013 0.333 L0.005 0.447 L0.05 0.447 L0.085 0.333 Z'
  },
  hatch: {
    head: 'M0.971 0.407 L0.987 0.531 L0.942 0.531 L0.899 0.407 Z',
    tail: 'M0.021 0.269 L0.023 0.407 L0.068 0.407 L0.093 0.269 Z'
  },
  sedan: {
    head: 'M0.943 0.395 L1 0.535 L0.955 0.535 L0.871 0.395 Z',
    tail: 'M0.013 0.333 L0.005 0.447 L0.05 0.447 L0.085 0.333 Z'
  },
  wagon: {
    head: 'M0.993 0.486 L1 0.571 L0.955 0.571 L0.921 0.486 Z',
    tail: 'M0.027 0.329 L0.018 0.436 L0.063 0.436 L0.099 0.329 Z'
  },
  coupe: {
    head: 'M0.987 0.447 L0.987 0.548 L0.942 0.548 L0.915 0.447 Z',
    tail: 'M0.009 0.284 L0.007 0.386 L0.052 0.386 L0.081 0.284 Z'
  },
  suv: {
    head: 'M0.946 0.382 L0.984 0.52 L0.939 0.52 L0.874 0.382 Z',
    tail: 'M0.021 0.336 L0.01 0.454 L0.055 0.454 L0.093 0.336 Z'
  },
  mpv: {
    head: 'M0.946 0.462 L0.993 0.613 L0.948 0.613 L0.874 0.462 Z',
    tail: 'M0.012 0.436 L0.007 0.604 L0.052 0.604 L0.084 0.436 Z'
  },
  van: {
    head: 'M0.961 0.482 L0.975 0.575 L0.93 0.575 L0.889 0.482 Z',
    tail: 'M0.016 0.513 L0.014 0.668 L0.059 0.668 L0.088 0.513 Z'
  },
  pickup: {
    head: 'M0.979 0.387 L0.991 0.512 L0.946 0.512 L0.907 0.387 Z',
    tail: 'M0.002 0.347 L0.012 0.545 L0.057 0.545 L0.074 0.347 Z'
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
  car: 'M0.658 0.333 Q0.658 0.283 0.688 0.288 L0.698 0.333 Z',
  hatch: 'M0.67 0.276 Q0.67 0.226 0.7 0.231 L0.71 0.276 Z',
  sedan: 'M0.658 0.333 Q0.658 0.283 0.688 0.288 L0.698 0.333 Z',
  wagon: 'M0.628 0.293 Q0.628 0.243 0.658 0.248 L0.668 0.293 Z',
  coupe: 'M0.582 0.269 Q0.582 0.219 0.612 0.224 L0.622 0.269 Z',
  suv: 'M0.671 0.329 Q0.671 0.279 0.701 0.284 L0.711 0.329 Z',
  mpv: 'M0.646 0.329 Q0.646 0.279 0.676 0.284 L0.686 0.329 Z',
  van: 'M0.825 0.435 Q0.825 0.385 0.855 0.39 L0.865 0.435 Z',
  pickup: 'M0.696 0.314 Q0.696 0.264 0.726 0.269 L0.736 0.314 Z',
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
