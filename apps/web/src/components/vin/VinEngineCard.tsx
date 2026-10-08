import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { displacementLiters, enginePower, gvwrClass, parseEngineLayout } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import { useVinText } from '@/components/vin/use-vin-text'
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
  const text = useVinText()
  const { l: unitL, hp: unitHp, kw: unitKw } = text.units
  const cylinders = Number(fields.get('Engine Number of Cylinders')) || null
  const liters = displacementLiters(fields)
  const { hp, kw } = enginePower(fields)
  const layout = parseEngineLayout(fields.get('Engine Configuration'))
  const fuelRaw = fields.get('Fuel Type - Primary')
  const fuel = fuelRaw ? text.value('Fuel Type - Primary', fuelRaw) : null
  const gvwrRaw = fields.get('Gross Vehicle Weight Rating From')
  const gvwr = gvwrRaw ? text.value('Gross Vehicle Weight Rating From', gvwrRaw) : null
  const gvwrCls = gvwrClass(gvwrRaw)
  const chips = [
    chip('Engine Model', 'engineModel'),
    chip('Valve Train Design', 'valveTrain'),
    chip('Engine Configuration', 'engineConfig'),
    chip('Turbo', 'turbo', `${t('vin.engine.turbo')}: `),
    chip('Electrification Level', 'electrification'),
    chip('Transmission Style', 'transmission')
  ].filter((c): c is Chip => !!c)

  if (!cylinders && !liters && !hp && !fuel && chips.length === 0) return null

  function chip(variable: string, infoKey: string, prefix = ''): Chip | null {
    const raw = fields.get(variable)
    if (!raw) return null
    const value = text.value(variable, raw)
    return { text: `${prefix}${value.text}`, en: value.en ? `${prefix}${value.en}` : null, infoKey }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {cylinders && cylinders <= MAX_DRAWN_CYLINDERS && <CylinderGlyph count={cylinders} layout={layout} />}

        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <Stat label={t('vin.engine.cylinders')} value={cylinders ? String(cylinders) : null} infoKey="cylinders" />
          <Stat
            label={t('vin.engine.displacement')}
            value={liters ? `${liters.toFixed(1)} ${unitL}` : null}
            infoKey="displacement"
          />
          <Stat
            label={t('vin.engine.power')}
            value={hp ? `${hp} ${unitHp}` : null}
            infoKey="horsepower"
            hint={kw ? `${kw} ${unitKw}` : null}
            hintInfoKey="kilowatts"
          />
          <Stat label={t('vin.engine.fuel')} value={fuel?.text ?? null} hint={fuel?.en} infoKey="fuelPrimary" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {hp && <Gauge label={t('vin.engine.power')} ratio={hp / HP_GAUGE_MAX} text={`${hp} ${unitHp}`} />}
        {liters && (
          <Gauge
            label={t('vin.engine.displacement')}
            ratio={liters / LITERS_GAUGE_MAX}
            text={`${liters.toFixed(1)} ${unitL}`}
          />
        )}
        {gvwrCls && (
          <div>
            <div className="mb-0.5 flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                {t('vin.engine.gvwr')}
                <Info infoKey="gvwr" title={t('vin.engine.gvwr')} />
              </span>
              <span className="text-right font-medium">
                {gvwr?.text}
                {gvwr?.en && <span className="block text-xs font-normal opacity-70">{gvwr.en}</span>}
              </span>
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
            <span
              key={c.text}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-border)]/50 px-2.5 py-0.5 text-sm"
            >
              {c.text}
              {c.en && <span className="text-xs opacity-70">{c.en}</span>}
              <Info infoKey={c.infoKey} title={c.text} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type Chip = { text: string; en: string | null; infoKey: string }

type InfoProps = { infoKey: string; title: string }

/** "?" popover with the `vin.info.<infoKey>` explanation (same text the field table shows). */
function Info({ infoKey, title }: InfoProps): ReactNode {
  const { t } = useTranslation()
  return (
    <InfoPopover label={t('vin.info.about', { field: title })} title={title}>
      <InfoText text={t(`vin.info.${infoKey}`)} />
    </InfoPopover>
  )
}

type StatProps = {
  label: string
  value: string | null
  /** Explains the value itself (shown beside it); without it the "?" sits on the label. */
  infoKey: string
  hint?: string | null
  hintInfoKey?: string
}

function Stat({ label, value, hint, infoKey, hintInfoKey }: StatProps): ReactNode {
  if (!value) return null
  const valueInfo = !!hintInfoKey
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
        {label}
        {!valueInfo && <Info infoKey={infoKey} title={label} />}
      </div>
      <div className="flex items-center gap-1.5 text-lg leading-tight font-semibold">
        {value}
        {valueInfo && <Info infoKey={infoKey} title={value} />}
      </div>
      {hint && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          {hint}
          {hintInfoKey && <Info infoKey={hintInfoKey} title={hint} />}
        </div>
      )}
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
