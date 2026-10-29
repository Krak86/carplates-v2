import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

const RIM_FILL = '#20241e'
const HUB_FILL = '#50534e'
const LIGHT_FILL = '#ced6ce'

type WheelProps = { cx: number; cy: number; r: number; hubR: number; spin: boolean }

/**
 * Rim + hub + a small off-center highlight dot, grouped so `animate-vehicle-wheel-spin`
 * (global.css) can rotate them together. The dot only exists to make the spin visible — two
 * perfectly concentric circles are rotationally symmetric, so without it a "spinning" wheel
 * would look perfectly static.
 */
function Wheel({ cx, cy, r, hubR, spin }: WheelProps): ReactNode {
  return (
    <g className={cn(spin && 'animate-vehicle-wheel-spin')}>
      <circle cx={cx} cy={cy} r={r} fill={RIM_FILL} />
      <circle cx={cx} cy={cy} r={hubR} fill={HUB_FILL} />
      <circle cx={cx} cy={cy - r * 0.55} r={r * 0.14} fill={LIGHT_FILL} />
    </g>
  )
}

type ShapeProps = { spin: boolean }

/**
 * Body geometry ported from the flat two-tone icon set in `apps/web/public/vehicles/`
 * (design reference, kept for anyone re-exporting the source set) — `fill` on the body/shadow
 * parts swapped for `var(--vehicle-body-color)` / `var(--vehicle-body-shadow-color)` so
 * `VehicleKindIcon` can tint each instance by the vehicle's own registry color; window/light
 * and wheel tones stay fixed, like real trim and glass. Each shares a 0 0 90 90 viewBox.
 */
export function SedanShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <polygon
        points="14.16,37.8 25.93,31.98 45,31.43 56.05,35.6 62.32,39.64 37.03,43.21 17.91,40.77"
        fill={RIM_FILL}
      />
      <path
        fill="var(--vehicle-body-color)"
        d="M 85.347 42.526 l -23.367 -4.73 l -8.231 -4.776 c -3.505 -2.034 -7.486 -3.105 -11.538 -3.105 h -4.915 c -0.002 0 -0.004 0 -0.006 0 h -5.611 c -4.304 0 -8.544 1.05 -12.35 3.06 l -6.167 3.255 c -1.231 0.65 -2.603 0.99 -3.995 0.99 H 6.703 c -2.434 0 -4.528 1.722 -4.998 4.11 l -1.642 8.345 c -0.342 1.738 0.735 3.44 2.451 3.875 l 7.945 2.016 c 0.637 0.162 1.289 0.257 1.945 0.284 l 15.742 0.65 h 37.26 c -0.032 -0.064 0.031 0.065 0 0 l 16.555 -0.288 l 4.521 -0.49 C 88.484 55.503 90 53.813 90 51.801 v -3.584 C 90 45.465 88.043 43.072 85.347 42.526 z M 42.21 32.914 c 3.519 0 6.988 0.934 10.032 2.7 l 5.752 3.337 c -1.497 0.454 -3.046 0.692 -4.628 0.692 h -13.7 l -1.485 -6.729 H 42.21 z M 20.728 35.627 c 3.361 -1.775 7.148 -2.713 10.949 -2.713 h 4.432 l 1.485 6.729 H 25.017 c -2.192 0 -4.313 -0.647 -6.132 -1.872 l -0.975 -0.656 L 20.728 35.627 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 86.483 50.72 l -4.521 0.49 l -16.555 0.288 c 0.016 0.033 0.007 0.016 -0.001 0 H 28.147 l -15.742 -0.65 c -0.657 -0.027 -1.309 -0.122 -1.945 -0.284 l -7.945 -2.016 c -0.834 -0.212 -1.513 -0.726 -1.956 -1.395 l -0.496 2.519 c -0.342 1.738 0.735 3.44 2.451 3.875 l 7.945 2.016 c 0.637 0.162 1.289 0.257 1.945 0.284 l 15.742 0.65 h 37.259 c 0.008 0.016 0.016 0.033 0.001 0 l 16.555 -0.288 l 4.521 -0.49 C 88.484 55.503 90 53.813 90 51.801 v -3.584 c 0 -0.248 -0.034 -0.488 -0.064 -0.729 C 89.636 49.186 88.251 50.528 86.483 50.72 z"
      />
      <Wheel cx={73.615} cy={52.402} r={7.684} hubR={4.7} spin={spin} />
      <Wheel cx={19.939} cy={52.402} r={7.684} hubR={4.7} spin={spin} />
      <path
        fill={LIGHT_FILL}
        d="M 88.804 44.718 h -6.561 v 0 c 1.266 1.542 3.157 2.437 5.152 2.437 h 2.502 C 89.728 46.255 89.343 45.428 88.804 44.718 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 0.742 46.223 h 1.793 c 0.842 0 1.524 -0.682 1.524 -1.524 v -1.711 c 0 -0.842 -0.682 -1.524 -1.524 -1.524 H 1.679 L 0.742 46.223 z"
      />
    </>
  )
}

export function BusShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <polygon
        points="5.65,27.35 5.65,41.56 75.65,41.56 83.38,45 88.12,45.66 88.12,44.01 88.12,35.42 85.69,29.53 82.07,27.35"
        fill={RIM_FILL}
      />
      <path
        fill="var(--vehicle-body-color)"
        d="M 80.837 25.509 H 4.179 C 1.875 25.509 0 27.383 0 29.688 v 18.638 c 0 1.117 0.435 2.167 1.226 2.956 c 0.79 0.789 1.838 1.223 2.955 1.223 c 0.001 0 0.002 0 0.003 0 l 8.423 -0.01 L 27.72 52.49 h 38.249 h 15.113 l 0.001 -0.001 c 0 0.002 -0.001 0.005 -0.001 0.007 l 5.147 0.01 c 2.079 0 3.771 -1.691 3.771 -3.771 v -7.608 C 90 34.85 87.56 25.509 80.837 25.509 z M 59.854 28.509 h 14.278 v 10.043 H 59.854 V 28.509 z M 42.576 28.509 h 14.278 v 10.043 H 42.576 V 28.509 z M 25.298 28.509 h 14.278 v 10.043 H 25.298 V 28.509 z M 8.02 37.666 v -9.157 h 14.278 v 10.043 H 8.906 C 8.417 38.552 8.02 38.155 8.02 37.666 z M 87 43.634 l -2.983 -0.002 c -0.502 -1.726 -1.817 -3.074 -3.535 -3.618 l -3.349 -1.061 V 28.509 h 3.704 c 4.204 0 6.163 7.53 6.163 12.619 V 43.634 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 86.083 47.497 c 0 -0.002 0.001 -0.005 0.001 -0.007 l -0.001 0.001 H 69.478 H 27.455 l -16.605 0.004 l -9.254 0.01 c -0.001 0 -0.002 0 -0.003 0 c -0.554 0 -1.089 -0.1 -1.593 -0.27 v 1.091 c 0 1.117 0.435 2.167 1.226 2.956 c 0.79 0.789 1.838 1.223 2.955 1.223 c 0.001 0 0.002 0 0.003 0 l 8.423 -0.01 L 27.72 52.49 h 38.249 h 15.113 l 0.001 -0.001 c 0 0.002 -0.001 0.005 -0.001 0.007 l 5.147 0.01 c 2.079 0 3.771 -1.691 3.771 -3.771 v -1.233 L 86.083 47.497 z"
      />
      <Wheel cx={75.646} cy={50.151} r={6.141} hubR={3.253} spin={spin} />
      <Wheel cx={13.463} cy={50.151} r={6.141} hubR={3.253} spin={spin} />
      <path
        fill={LIGHT_FILL}
        d="M 90 41.985 h -1.878 v 1.621 c 0 1.103 0.773 2.075 1.859 2.272 L 90 45.882 V 41.985 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 0 41.891 v 3.589 h 0.574 c 0.635 0 1.15 -0.515 1.15 -1.15 v -1.292 c 0 -0.626 -0.501 -1.133 -1.123 -1.148 L 0 41.891 z"
      />
    </>
  )
}

export function TruckShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <polygon points="52.37,25.06 52.37,41.73 76.27,41.73 74.17,37.83 64.32,26.41" fill={RIM_FILL} />
      <path
        fill="var(--vehicle-body-color)"
        d="M 87.377 43.991 l -9.706 -4.472 l -9.659 -11.621 c -2.052 -2.468 -5.07 -3.884 -8.279 -3.884 H 5.299 C 2.377 24.014 0 26.391 0 29.313 V 55.3 c 0 3.059 2.488 5.547 5.551 5.547 l 4.434 -0.014 l 75.815 0.01 l 0.64 0.004 c 1.963 0 3.56 -1.597 3.56 -3.56 v -9.2 C 90 46.333 88.971 44.725 87.377 43.991 z M 56.585 27.014 h 3.147 c 2.315 0 4.492 1.021 5.973 2.802 l 7.832 9.424 H 57.163 c -0.318 0 -0.578 -0.259 -0.578 -0.578 V 27.014 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 88.84 53.847 l -0.68 -0.004 l -80.551 -0.01 l -4.711 0.014 c -1.054 0 -2.041 -0.264 -2.898 -0.721 V 55.3 c 0 3.059 2.488 5.547 5.551 5.547 l 4.434 -0.014 l 75.815 0.01 l 0.64 0.004 c 1.963 0 3.56 -1.597 3.56 -3.56 v -3.629 C 89.632 53.771 89.247 53.847 88.84 53.847 z"
      />
      <Wheel cx={74.175} cy={57.489} r={8.497} hubR={4.501} spin={spin} />
      <Wheel cx={15.811} cy={57.489} r={8.497} hubR={4.5} spin={spin} />
      <path
        fill={LIGHT_FILL}
        d="M 90 48.088 c 0 -0.411 -0.061 -0.813 -0.168 -1.198 h -7.558 c 1.93 2.351 4.723 3.795 7.726 4.05 V 48.088 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 0 50.385 h 2.233 c 0.883 0 1.599 -0.716 1.599 -1.599 V 46.99 c 0 -0.871 -0.696 -1.575 -1.562 -1.596 l -2.27 0 V 50.385 z"
      />
    </>
  )
}

export function MotorcycleShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <Wheel cx={25.249} cy={65.379} r={12.109} hubR={6.099} spin={spin} />
      <Wheel cx={77.889} cy={65.379} r={12.109} hubR={6.099} spin={spin} />
      <path
        fill="var(--vehicle-body-color)"
        d="M 8.604 63.975 h 57.789 c 0 -6.08 7.663 -12.99 12.99 -12.99 L 61.417 19.476 h 0 c -3.752 0 -6.553 3.455 -5.776 7.126 l 4.872 23.016 c 0.287 1.358 -0.058 2.772 -0.939 3.844 v 0 c -0.867 1.056 -2.162 1.668 -3.528 1.668 H 43.624 c -2.302 0 -4.168 -1.866 -4.168 -4.168 v -5.73 c 0 -2.776 -2.251 -5.027 -5.027 -5.027 h -16.56 c -3.638 0 -6.893 2.262 -8.162 5.672 l -4.77 12.82 C 3.985 61.254 5.876 63.975 8.604 63.975 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 89.09 57.211 c -1.659 -3.486 -4.81 -6.28 -9.039 -7.311 c -5.484 -1.338 -11.363 1.014 -14.4 5.773 c -2.139 3.35 -2.616 7.134 -1.769 10.552 c 0.179 0.723 1.129 0.899 1.589 0.312 c 5.295 -6.762 14.104 -9.979 22.587 -8.07 C 88.787 58.629 89.411 57.886 89.09 57.211 z"
      />
      <path
        fill="var(--vehicle-body-color)"
        d="M 5.161 12.516 h 24.54 c 2.85 0 5.161 2.311 5.161 5.161 v 22.486 H 5.161 C 2.311 40.164 0 37.853 0 35.002 V 17.677 C 0 14.827 2.311 12.516 5.161 12.516 z"
      />
      <path
        fill="var(--vehicle-body-color)"
        d="M 70.726 20.115 h 0.844 c 1.028 0 1.862 0.834 1.862 1.862 v 8.725 c 0 1.028 -0.834 1.862 -1.862 1.862 h -0.844 c -3.438 0 -6.225 -2.787 -6.225 -6.225 v 0 C 64.501 22.902 67.288 20.115 70.726 20.115 z"
      />
      <path
        fill="var(--vehicle-body-color)"
        d="M 62.498 19.33 c 0 1.464 -1.187 2.652 -2.652 2.652 s -6.167 -1.187 -6.167 -2.652 c 0 -1.464 4.703 -2.652 6.167 -2.652 S 62.498 17.865 62.498 19.33 z"
      />
    </>
  )
}

export function TrailerShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path
        fill="var(--vehicle-body-color)"
        d="M 88.5 58.606 c -0.828 0 -1.5 0.672 -1.5 1.5 v 3.085 H 72.667 V 21.84 c 0 -3.252 -2.646 -5.898 -5.897 -5.898 H 5.898 C 2.646 15.942 0 18.588 0 21.84 v 38.454 c 0 3.252 2.646 5.897 5.898 5.897 h 18.626 h 23.619 h 4.359 h 18.665 H 88.5 c 0.828 0 1.5 -0.672 1.5 -1.5 v -4.585 C 90 59.278 89.328 58.606 88.5 58.606 z"
      />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 88.5 58.606 c -0.828 0 -1.5 0.672 -1.5 1.5 v 3.085 H 72.667 v -7 H 61.396 H 56.05 H 27.08 H 4.234 c -1.582 0 -3.042 -0.421 -4.234 -1.126 v 5.228 c 0 3.252 2.646 5.897 5.898 5.897 h 18.626 h 23.619 h 4.359 h 18.665 H 88.5 c 0.828 0 1.5 -0.672 1.5 -1.5 v -4.585 C 90 59.278 89.328 58.606 88.5 58.606 z"
      />
      <Wheel cx={37.769} cy={65.561} r={8.497} hubR={4.501} spin={spin} />
      <path
        fill="var(--vehicle-body-shadow-color)"
        d="M 1.959 46.358 l -1.959 0 v 4.991 h 1.921 c 0.883 0 1.599 -0.716 1.599 -1.599 v -1.796 C 3.521 47.083 2.824 46.378 1.959 46.358 z"
      />
    </>
  )
}

const GLASS_FILL = '#b9c9d3'

/** A scooter: step-through floor, leg shield, seat and a small wheel at each end. */
export function MopedShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path fill="var(--vehicle-body-color)" d="M7 46 Q7 37 16 36 H42 Q47 36 48 41 L49 54 H31 Q23 54 19 59 L10 54 Z" />
      <path
        fill="var(--vehicle-body-color)"
        d="M44 49 H58 L62 28 Q63 24 67 24 H70 Q73 24 72 28 L68 51 L71 60 H58 L56 56 H44 Z"
      />
      <path fill="var(--vehicle-body-shadow-color)" d="M44 54 H56 L58 60 H71 L70 63 H44 Z" />
      <path fill={HUB_FILL} d="M16 36 H42 Q44 36 44 38 H14 Q14 36 16 36 Z" />
      <path fill={RIM_FILL} d="M58 18 H72 Q74 18 74 20 V22 H58 Z" />
      <path d="M68 28 L75 61" stroke={RIM_FILL} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path fill={LIGHT_FILL} d="M71 24 H76 Q78 24 78 27 V29 H71 Z" />
      <Wheel cx={21} cy={61} r={8} hubR={4} spin={spin} />
      <Wheel cx={75} cy={61} r={8} hubR={4} spin={spin} />
    </>
  )
}

/** An ATV: fat knobbly wheels, fenders over them, a long seat and wide handlebars. */
export function QuadShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path
        fill="var(--vehicle-body-color)"
        d="M12 42 Q12 33 22 33 H44 L48 26 H60 L66 31 L69 44 H58 L52 49 H26 Q14 49 12 42 Z"
      />
      <path fill="var(--vehicle-body-shadow-color)" d="M26 49 H52 L58 44 H69 L69 48 H56 L50 53 H28 Z" />
      <path fill={RIM_FILL} d="M56 20 H72 V24 H56 Z M64 24 H68 L70 40 H66 Z" />
      <path fill={HUB_FILL} d="M18 33 H44 V37 H16 Z" />
      <path fill={LIGHT_FILL} d="M69 36 H74 Q76 36 76 39 V42 H69 Z" />
      <Wheel cx={22} cy={56} r={12} hubR={6} spin={spin} />
      <Wheel cx={70} cy={56} r={12} hubR={6} spin={spin} />
      <path
        fill="var(--vehicle-body-color)"
        d="M8 54 A14 14 0 0 1 36 54 L32 54 A10 10 0 0 0 12 54 Z M56 54 A14 14 0 0 1 84 54 L80 54 A10 10 0 0 0 60 54 Z"
      />
    </>
  )
}

/** A cargo trike: scooter front, an open box on two rear wheels. */
export function TricycleShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path fill="var(--vehicle-body-color)" d="M2 30 H36 V58 H2 Z" />
      <path fill="var(--vehicle-body-shadow-color)" d="M2 50 H36 V58 H2 Z" />
      <path fill={HUB_FILL} d="M2 30 H36 V34 H2 Z" />
      <path
        fill="var(--vehicle-body-color)"
        d="M38 46 H52 L57 36 Q58 34 61 34 L65 22 H72 Q75 22 74 26 L70 46 L73 58 H38 Z"
      />
      <path fill={GLASS_FILL} d="M59 36 L62 28 H68 L66 38 Z" />
      <path fill={RIM_FILL} d="M60 17 H74 V21 H60 Z" />
      <path d="M69 30 L77 61" stroke={RIM_FILL} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path fill={LIGHT_FILL} d="M72 25 H77 Q79 25 79 28 V30 H72 Z" />
      <Wheel cx={18} cy={60} r={9} hubR={4.5} spin={spin} />
      <Wheel cx={76} cy={61} r={8} hubR={4} spin={spin} />
    </>
  )
}

/** A panel van: tall box body, a short cab with a side window and a raked windscreen. */
export function VanShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path
        fill="var(--vehicle-body-color)"
        d="M3 58 V27 Q3 22 8 22 H57 Q62 22 66 27 L75 40 Q84 42 87 47 V58 Q87 60 85 60 H5 Q3 60 3 58 Z"
      />
      <path fill="var(--vehicle-body-shadow-color)" d="M3 52 H87 V58 Q87 60 85 60 H5 Q3 60 3 58 Z" />
      <path fill={GLASS_FILL} d="M60 27 L69 40 H58 V27 Z" />
      <path d="M44 24 V52 M58 24 V52" stroke="var(--vehicle-body-shadow-color)" strokeWidth="1.2" fill="none" />
      <path fill={LIGHT_FILL} d="M82 46 H88 V51 H84 Q82 51 82 49 Z" />
      <path fill={RIM_FILL} d="M3 46 H6 V52 H3 Z" />
      <Wheel cx={22} cy={59} r={8.5} hubR={4.5} spin={spin} />
      <Wheel cx={71} cy={59} r={8.5} hubR={4.5} spin={spin} />
    </>
  )
}

/** A semi-trailer: a long box with its rear bogie on the left and the landing legs under the kingpin at the front. */
export function SemiTrailerShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path fill="var(--vehicle-body-color)" d="M2 18 H86 Q88 18 88 20 V52 H2 Z" />
      <path fill="var(--vehicle-body-shadow-color)" d="M2 46 H88 V52 H2 Z" />
      <path
        d="M22 20 V44 M42 20 V44 M62 20 V44"
        stroke="var(--vehicle-body-shadow-color)"
        strokeWidth="1.2"
        fill="none"
      />
      <path fill={RIM_FILL} d="M2 52 H88 V55 H2 Z" />
      <path fill={HUB_FILL} d="M72 55 H77 V66 H72 Z" />
      <path fill={RIM_FILL} d="M69 64 H80 V67 H69 Z" />
      <Wheel cx={14} cy={61} r={7} hubR={3.6} spin={spin} />
      <Wheel cx={30} cy={61} r={7} hubR={3.6} spin={spin} />
      <Wheel cx={46} cy={61} r={7} hubR={3.6} spin={spin} />
    </>
  )
}

/** A box truck: a tall cargo box behind a short cab-over cab. */
export function BoxTruckShape({ spin }: ShapeProps): ReactNode {
  return (
    <>
      <path fill="var(--vehicle-body-color)" d="M2 12 H57 Q59 12 59 14 V56 H2 Z" />
      <path fill="var(--vehicle-body-shadow-color)" d="M2 50 H59 V56 H2 Z" />
      <path d="M20 14 V46 M38 14 V46" stroke="var(--vehicle-body-shadow-color)" strokeWidth="1.2" fill="none" />
      <path fill="var(--vehicle-body-color)" d="M61 56 V30 Q61 26 65 26 H73 Q76 26 78 30 L83 42 Q88 44 88 48 V56 Z" />
      <path fill="var(--vehicle-body-shadow-color)" d="M61 51 H88 V56 H61 Z" />
      <path fill={GLASS_FILL} d="M66 30 H72 L77 40 H66 Z" />
      <path fill={LIGHT_FILL} d="M84 46 H88 V50 H86 Q84 50 84 48 Z" />
      <path fill={RIM_FILL} d="M2 56 H88 V58 H2 Z" />
      <Wheel cx={19} cy={60} r={8.5} hubR={4.5} spin={spin} />
      <Wheel cx={72} cy={60} r={8.5} hubR={4.5} spin={spin} />
    </>
  )
}
