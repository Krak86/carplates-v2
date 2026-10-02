import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { buildSchematicModel } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import { cn } from '@/lib/cn'

type Props = {
  fields: FieldMap
}

const LAYERS = ['seats', 'drive', 'airbagFront', 'airbagSide', 'airbagCurtain', 'airbagKnee', 'tpms', 'doors'] as const
type Layer = (typeof LAYERS)[number]

const COLOR = {
  front: '#f59e0b',
  side: '#f97316',
  curtain: '#38bdf8',
  knee: '#e879f9',
  tpms: '#10b981',
  drive: 'var(--color-primary)',
  neutral: 'var(--color-muted)'
} as const

const LAYER_COLOR: Readonly<Record<Layer, string>> = {
  seats: COLOR.neutral,
  doors: COLOR.neutral,
  drive: COLOR.drive,
  airbagFront: COLOR.front,
  airbagSide: COLOR.side,
  airbagCurtain: COLOR.curtain,
  airbagKnee: COLOR.knee,
  tpms: COLOR.tpms
}

const SEAT_W = 28
const SEAT_H = 24
const SEAT_X = { left: 88, right: 124 } as const
const ROW_Y: Readonly<Record<number, readonly number[]>> = {
  1: [212],
  2: [198, 262],
  3: [196, 238, 280]
}
const DEFAULT_ROW_Y: readonly number[] = [198, 262]
const WHEELS = [
  { x: 54, y: 72 },
  { x: 174, y: 72 },
  { x: 54, y: 300 },
  { x: 174, y: 300 }
] as const
const AXLE_Y = { front: 94, rear: 322 } as const

/** Top-down car outline, front at the top, with the decoded equipment placed where it physically sits. */
export default function VinCarSchematic({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const [hidden, setHidden] = useState<ReadonlySet<Layer>>(new Set())
  const m = buildSchematicModel(fields)
  const rowYs = ROW_Y[m.rows] ?? DEFAULT_ROW_Y
  const firstRowY = rowYs[0] ?? 0
  const { front, side, curtain, knee } = m.airbags

  const available: Record<Layer, boolean> = {
    seats: true,
    drive: m.drive !== null,
    airbagFront: front !== null,
    airbagSide: side !== null,
    airbagCurtain: curtain !== null,
    airbagKnee: knee !== null,
    tpms: m.tpms !== null,
    doors: m.doors !== null
  }
  const shown = (layer: Layer): boolean => available[layer] && !hidden.has(layer)
  const toggle = (layer: Layer): void =>
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })

  const coveredYs = curtain ? curtain.rows.flatMap(r => rowYs.slice(r - 1, r)) : []
  const curtainTop = Math.min(...coveredYs) - 4
  const curtainHeight = Math.max(...coveredYs) + SEAT_H + 4 - curtainTop
  const doorsPerSide = m.doors === null ? 0 : m.doors >= 4 ? 2 : 1
  const hasTailgate = m.doors !== null && m.doors % 2 === 1

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg viewBox="0 0 240 420" role="img" aria-label={t('vin.car.title')} className="h-72 w-auto shrink-0">
        {/* drivetrain, under the body */}
        {shown('drive') && m.drive && (
          <g stroke={COLOR.drive} strokeWidth={4} strokeLinecap="round" opacity={0.85}>
            {(m.drive === 'fwd' || m.drive === 'awd') && <line x1={64} y1={AXLE_Y.front} x2={176} y2={AXLE_Y.front} />}
            {(m.drive === 'rwd' || m.drive === 'awd') && <line x1={64} y1={AXLE_Y.rear} x2={176} y2={AXLE_Y.rear} />}
            {m.drive === 'awd' && <line x1={120} y1={AXLE_Y.front} x2={120} y2={AXLE_Y.rear} strokeDasharray="2 7" />}
          </g>
        )}

        {/* wheels */}
        {WHEELS.map(w => (
          <rect
            key={`${w.x}-${w.y}`}
            x={w.x}
            y={w.y}
            width={12}
            height={44}
            rx={4}
            className="fill-[var(--color-fg)]/70"
          />
        ))}

        {/* body + glass */}
        <path
          d="M 82 34 Q 120 12 158 34 L 168 120 L 170 330 L 164 396 Q 120 422 76 396 L 70 330 L 72 120 Z"
          className="fill-[var(--color-surface)] stroke-[var(--color-muted)]"
          strokeWidth={2}
        />
        <path d="M 88 124 L 152 124 L 146 166 L 94 166 Z" className="fill-sky-400/25 stroke-[var(--color-muted)]/60" />
        <path d="M 92 302 L 148 302 L 154 332 L 86 332 Z" className="fill-sky-400/25 stroke-[var(--color-muted)]/60" />

        {/* doors: one handle per door, tailgate mark for odd door counts */}
        {shown('doors') && (
          <g className="stroke-[var(--color-muted)]" strokeWidth={2} strokeLinecap="round">
            {Array.from({ length: doorsPerSide }, (_, i) => {
              const y = (rowYs[i] ?? firstRowY) + SEAT_H / 2
              return (
                <g key={i}>
                  <line x1={77} y1={y - 5} x2={77} y2={y + 5} />
                  <line x1={163} y1={y - 5} x2={163} y2={y + 5} />
                </g>
              )
            })}
            {hasTailgate && <line x1={104} y1={398} x2={136} y2={398} />}
          </g>
        )}

        {/* seats (+ steering wheel on the driver's side) */}
        {shown('seats') &&
          rowYs.map((y, r) => (
            <g key={y} className="fill-[var(--color-border)] stroke-[var(--color-muted)]/70">
              <rect x={SEAT_X.left} y={y} width={SEAT_W} height={SEAT_H} rx={7} />
              <rect x={SEAT_X.right} y={y} width={SEAT_W} height={SEAT_H} rx={7} />
              {r === 0 && <circle cx={102} cy={y - 18} r={9} fill="none" strokeWidth={3} />}
            </g>
          ))}

        {/* curtain airbags: long strips above the windows */}
        {shown('airbagCurtain') && curtain && coveredYs.length > 0 && (
          <g fill={COLOR.curtain} opacity={0.85}>
            {curtain.driver && <rect x={72} y={curtainTop} width={5} height={curtainHeight} rx={2.5} />}
            {curtain.passenger && <rect x={163} y={curtainTop} width={5} height={curtainHeight} rx={2.5} />}
          </g>
        )}

        {/* side airbags: per seat, in the door-side bolster */}
        {shown('airbagSide') &&
          side &&
          side.rows.map(r => {
            const y = rowYs[r - 1]
            if (y === undefined) return null
            return (
              <g key={r} fill={COLOR.side}>
                {side.driver && <rect x={79} y={y + 2} width={7} height={SEAT_H - 4} rx={3.5} />}
                {side.passenger && <rect x={154} y={y + 2} width={7} height={SEAT_H - 4} rx={3.5} />}
              </g>
            )
          })}

        {/* front airbags: bursts at the steering wheel and the dash */}
        {shown('airbagFront') && front && (
          <g fill={COLOR.front} fillOpacity={0.55} stroke={COLOR.front} strokeDasharray="3 3">
            {front.driver && <circle cx={102} cy={firstRowY - 18} r={15} />}
            {front.passenger && <circle cx={138} cy={firstRowY - 18} r={15} />}
          </g>
        )}

        {/* knee airbags: below the dash */}
        {shown('airbagKnee') && knee && (
          <g fill={COLOR.knee} fillOpacity={0.7}>
            {knee.driver && <ellipse cx={102} cy={firstRowY - 3} rx={11} ry={4} />}
            {knee.passenger && <ellipse cx={138} cy={firstRowY - 3} rx={11} ry={4} />}
          </g>
        )}

        {/* TPMS: a sensor in each wheel — solid when direct, dashed ring when inferred from ABS */}
        {shown('tpms') &&
          m.tpms &&
          WHEELS.map(w => (
            <circle
              key={`t-${w.x}-${w.y}`}
              cx={w.x + 6}
              cy={w.y + 22}
              r={m.tpms === 'direct' ? 3.5 : 4.5}
              fill={m.tpms === 'direct' ? COLOR.tpms : 'none'}
              stroke={COLOR.tpms}
              strokeWidth={1.5}
              strokeDasharray={m.tpms === 'direct' ? undefined : '2 2'}
            />
          ))}
      </svg>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">{t('vin.car.layersHint')}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('vin.car.layers')}>
          {LAYERS.filter(l => available[l]).map(layer => (
            <button
              key={layer}
              type="button"
              aria-pressed={!hidden.has(layer)}
              onClick={() => toggle(layer)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-sm transition-opacity',
                hidden.has(layer) && 'opacity-45'
              )}
            >
              <span
                aria-hidden
                className="flex size-4 items-center justify-center rounded-full text-[10px] leading-none text-white"
                style={{
                  background: hidden.has(layer) ? 'transparent' : LAYER_COLOR[layer],
                  border: `1.5px solid ${LAYER_COLOR[layer]}`
                }}
              >
                {hidden.has(layer) ? '' : '✓'}
              </span>
              {t(`vin.car.layer.${layer}`)}
              {layer === 'drive' && m.drive && <span className="font-semibold">{t(`vin.car.drive.${m.drive}`)}</span>}
              {layer === 'doors' && m.doors !== null && <span className="font-semibold">{m.doors}</span>}
            </button>
          ))}
        </div>

        {m.rowsInferred && <p className="text-xs text-[var(--color-muted)]">{t('vin.car.rowsInferred')}</p>}
      </div>
    </div>
  )
}
