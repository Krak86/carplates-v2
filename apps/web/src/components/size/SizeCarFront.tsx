import type { ReactNode } from 'react'

import { MIRRORS_MM } from '@/components/size/fit'
import { LAMP_COLOR, TYRE_COLOR, WHEEL_MM } from '@/components/size/silhouettes'
import type { SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  /** Top-left corner of the body box in drawing millimetres; the ground is at `y + heightMm`. */
  x: number
  y: number
  widthMm: number
  heightMm: number
  shape: SizeShape
}

/** All fractions of the body box: x across 0..1, y from the roof (0) to the ground (1). */
export type FrontProfile = {
  /** Width of the roof and of the windscreen base, as a share of the body width. */
  roofW: number
  baseW: number
  /** Where the windscreen starts at the top, the cowl line (screen base) and the top of the front panel. */
  glassTop: number
  belt: number
  hood: number
  lamp: readonly [number, number]
  grille: readonly [number, number]
  /** Lower edge of the bumper: the tyres show below it. */
  bumper: number
}

const LOW: FrontProfile = {
  roofW: 0.64,
  baseW: 0.92,
  glassTop: 0.08,
  belt: 0.4,
  hood: 0.5,
  lamp: [0.5, 0.62],
  grille: [0.64, 0.7],
  bumper: 0.84
}
const TALL: FrontProfile = {
  roofW: 0.8,
  baseW: 0.95,
  glassTop: 0.07,
  belt: 0.36,
  hood: 0.46,
  lamp: [0.46, 0.58],
  grille: [0.6, 0.68],
  bumper: 0.84
}
const BOX: FrontProfile = {
  roofW: 0.92,
  baseW: 1,
  glassTop: 0.06,
  belt: 0.5,
  hood: 0.58,
  lamp: [0.66, 0.76],
  grille: [0.78, 0.84],
  bumper: 0.88
}

/** The head-on silhouette family of each body shape; a motorcycle has none (no front view is drawn). */
export const FRONT_PROFILES: Readonly<Record<SizeShape, FrontProfile | null>> = {
  car: LOW,
  hatch: LOW,
  sedan: LOW,
  wagon: LOW,
  coupe: LOW,
  suv: TALL,
  mpv: TALL,
  pickup: TALL,
  van: BOX,
  truck: BOX,
  bus: BOX,
  moto: null
}

const TYRE_WIDTH_MM = 230
const TYRE_OUT_MM = 25
const MIRROR_W_MM = MIRRORS_MM / 2
const MIRROR_H_MM = 170
const PLATE_MM = { width: 520, height: 110 }

/** The outline of a front view: a lower box with the fascia and a tapered glass-house on top, in the unit box. */
export function frontBodyPath(p: FrontProfile): string {
  const l = 0.5 - p.baseW / 2
  const r = 0.5 + p.baseW / 2
  const rl = 0.5 - p.roofW / 2
  const rr = 0.5 + p.roofW / 2
  return [
    `M0.02 ${p.bumper} L0 ${p.bumper - 0.04} L0 ${p.hood}`,
    `L${l} ${p.belt} L${rl} 0.05 Q${rl + 0.02} 0 ${rl + 0.07} 0 L${rr - 0.07} 0 Q${rr - 0.02} 0 ${rr} 0.05`,
    `L${r} ${p.belt} L1 ${p.hood} L1 ${p.bumper - 0.04} L0.98 ${p.bumper} Z`
  ].join(' ')
}

export function frontGlassPath(p: FrontProfile): string {
  const l = 0.5 - p.baseW / 2 + 0.03
  const r = 0.5 + p.baseW / 2 - 0.03
  const rl = 0.5 - p.roofW / 2 + 0.04
  const rr = 0.5 + p.roofW / 2 - 0.04
  return `M${l} ${p.belt - 0.015} L${rl} ${p.glassTop} L${rr} ${p.glassTop} L${r} ${p.belt - 0.015} Z`
}

function lampPath(p: FrontProfile, side: 'left' | 'right'): string {
  const [top, bottom] = p.lamp
  const edge = side === 'left' ? 0.03 : 0.97
  const inner = side === 'left' ? 0.3 : 0.7
  return `M${edge} ${top} L${inner} ${top + 0.03} L${inner} ${bottom} L${edge} ${bottom} Z`
}

/**
 * The vehicle head-on at real scale: tapered body, windscreen, lamps, grille, number plate, mirrors and the tyres below the
 * bumper, with a centre line like a drawing sheet. Same tokens as the side view, so the blueprint style recolours it too.
 */
export default function SizeCarFront({ x, y, widthMm: w, heightMm: h, shape }: Props): ReactNode {
  const p = FRONT_PROFILES[shape]
  if (!p) return null

  const tyreTop = y + h * p.bumper
  const tyreH = Math.min(y + h - tyreTop, WHEEL_MM[shape])
  const plateY = y + h * ((p.grille[1] + p.bumper) / 2) - PLATE_MM.height / 2
  const mirrorY = y + h * p.belt - MIRROR_H_MM / 4
  const line = { stroke: 'var(--color-primary)', vectorEffect: 'non-scaling-stroke' } as const

  return (
    <g>
      <g fill={TYRE_COLOR} stroke="var(--color-fg)" strokeOpacity={0.5} strokeWidth={1}>
        <rect
          x={x - TYRE_OUT_MM}
          y={tyreTop}
          width={TYRE_WIDTH_MM}
          height={tyreH}
          rx={30}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={x + w - TYRE_WIDTH_MM + TYRE_OUT_MM}
          y={tyreTop}
          width={TYRE_WIDTH_MM}
          height={tyreH}
          rx={30}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      <g fill="var(--color-primary)" fillOpacity={0.5}>
        <rect x={x - MIRROR_W_MM} y={mirrorY} width={MIRROR_W_MM + w * 0.03} height={MIRROR_H_MM} rx={40} />
        <rect x={x + w - w * 0.03} y={mirrorY} width={MIRROR_W_MM + w * 0.03} height={MIRROR_H_MM} rx={40} />
      </g>

      <g transform={`translate(${x} ${y}) scale(${w} ${h})`}>
        <path
          d={frontBodyPath(p)}
          fill="var(--color-primary)"
          fillOpacity={0.2}
          strokeWidth={2}
          strokeLinejoin="round"
          {...line}
        />
        <path d={frontGlassPath(p)} fill="var(--color-surface)" fillOpacity={0.8} />
        <path
          d={`M${0.5 - p.baseW / 2} ${p.belt} H${0.5 + p.baseW / 2} M0.12 ${p.bumper - 0.05} H0.88`}
          fill="none"
          strokeOpacity={0.55}
          strokeWidth={1}
          {...line}
        />
        {(['left', 'right'] as const).map(side => (
          <path key={side} d={lampPath(p, side)} fill={LAMP_COLOR} strokeWidth={1} strokeLinejoin="round" {...line} />
        ))}
        <rect
          x={0.34}
          y={p.grille[0]}
          width={0.32}
          height={p.grille[1] - p.grille[0]}
          fill="none"
          strokeWidth={1}
          {...line}
        />
      </g>

      <rect
        x={x + w / 2 - PLATE_MM.width / 2}
        y={plateY}
        width={PLATE_MM.width}
        height={PLATE_MM.height}
        fill="var(--color-surface)"
        fillOpacity={0.8}
        strokeWidth={1}
        {...line}
      />

      <line
        x1={x + w / 2}
        y1={y - h * 0.06}
        x2={x + w / 2}
        y2={y + h * 1.04}
        stroke="var(--color-muted)"
        strokeWidth={1}
        strokeDasharray="60 40"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
