import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { displacementLiters, enginePower, gvwrClass, parseEngineLayout } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import type { EngineLayout } from '@/components/vin/types'

type Props = {
  fields: FieldMap
}

// Gauge ceilings: a bar at 100% means "at or above this", not a physical limit.
const HP_GAUGE_MAX = 450
const LITERS_GAUGE_MAX = 6
const GVWR_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8] as const
const MAX_DRAWN_CYLINDERS = 16
const BORE = 7

/** Engine summary: cylinder layout glyph, headline numbers, and gauges for power, size and weight class. */
export default function VinEngineCard({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const cylinders = Number(fields.get('Engine Number of Cylinders')) || null
  const liters = displacementLiters(fields)
  const { hp, kw } = enginePower(fields)
  const layout = parseEngineLayout(fields.get('Engine Configuration'))
  const fuel = fields.get('Fuel Type - Primary')
  const gvwr = fields.get('Gross Vehicle Weight Rating From')
  const gvwrCls = gvwrClass(gvwr)
  const chips = [
    fields.get('Engine Model'),
    fields.get('Valve Train Design'),
    fields.get('Engine Configuration'),
    fields.get('Turbo') ? `${t('vin.engine.turbo')}: ${fields.get('Turbo')}` : undefined,
    fields.get('Electrification Level'),
    fields.get('Transmission Style')
  ].filter((c): c is string => !!c)

  if (!cylinders && !liters && !hp && !fuel && chips.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-4">
        {cylinders && cylinders <= MAX_DRAWN_CYLINDERS && <CylinderGlyph count={cylinders} layout={layout} />}

        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <Stat label={t('vin.engine.cylinders')} value={cylinders ? String(cylinders) : null} />
          <Stat label={t('vin.engine.displacement')} value={liters ? `${liters.toFixed(1)} L` : null} />
          <Stat label={t('vin.engine.power')} value={hp ? `${hp} hp` : null} hint={kw ? `${kw} kW` : null} />
          <Stat label={t('vin.engine.fuel')} value={fuel ?? null} />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {hp && <Gauge label={t('vin.engine.power')} ratio={hp / HP_GAUGE_MAX} text={`${hp} hp`} />}
        {liters && (
          <Gauge
            label={t('vin.engine.displacement')}
            ratio={liters / LITERS_GAUGE_MAX}
            text={`${liters.toFixed(1)} L`}
          />
        )}
        {gvwrCls && (
          <div>
            <div className="mb-0.5 flex justify-between text-sm">
              <span className="text-[var(--color-muted)]">{t('vin.engine.gvwr')}</span>
              <span className="font-medium">{gvwr}</span>
            </div>
            <div className="flex gap-0.5" role="img" aria-label={t('vin.engine.gvwrClass', { n: gvwrCls })}>
              {GVWR_CLASSES.map(c => (
                <div
                  key={c}
                  className={`h-2 flex-1 rounded-sm ${c <= gvwrCls ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className="rounded-full bg-[var(--color-border)]/50 px-2.5 py-0.5 text-sm">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type StatProps = { label: string; value: string | null; hint?: string | null }

function Stat({ label, value, hint }: StatProps): ReactNode {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="text-lg leading-tight font-semibold">{value}</div>
      {hint && <div className="text-xs text-[var(--color-muted)]">{hint}</div>}
    </div>
  )
}

type GaugeProps = { label: string; ratio: number; text: string }

function Gauge({ label, ratio, text }: GaugeProps): ReactNode {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-sm">
        <span className="text-[var(--color-muted)]">{label}</span>
        <span className="font-medium">{text}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }}
        />
      </div>
    </div>
  )
}

type GlyphProps = { count: number; layout: EngineLayout | null }

/** Cylinders from above: one row for in-line, two staggered banks for V and flat engines. */
function CylinderGlyph({ count, layout }: GlyphProps): ReactNode {
  const twoBanks = (layout === 'v' || layout === 'flat') && count >= 4
  const perBank = twoBanks ? Math.ceil(count / 2) : count
  const spacing = BORE * 2 + 3
  const bankGap = layout === 'flat' ? 30 : 16
  const width = perBank * spacing + 4
  const height = twoBanks ? BORE * 2 * 2 + bankGap : BORE * 2 + 4
  const bank = (n: number, y: number, offset: number): ReactNode =>
    Array.from({ length: n }, (_, i) => (
      <circle key={`${y}-${i}`} cx={BORE + 2 + offset + i * spacing} cy={y} r={BORE} />
    ))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.min(width, 120)}
      aria-hidden
      className="shrink-0 fill-[var(--color-primary)]/25 stroke-[var(--color-primary)]"
    >
      {twoBanks ? (
        <>
          {bank(perBank, BORE + 2, 0)}
          {bank(count - perBank, height - BORE - 2, spacing / 2)}
        </>
      ) : (
        bank(count, BORE + 2, 0)
      )}
    </svg>
  )
}
