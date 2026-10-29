import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { licenceFor, towVerdict } from '@/components/RdwInsights.helpers'
import SideSilhouette, { Wheel } from '@/components/size/SideSilhouette'
import { axlePositions, DRAW_TYPICAL } from '@/components/size/silhouettes'
import { cn } from '@/lib/cn'

type Props = {
  /** Permitted gross mass of the car, kg (registry or RDW). */
  gross: number | null
  /** Highest braked trailer the car may pull, kg. */
  braked: number | null
  /** Highest unbraked trailer the car may pull, kg. */
  unbraked?: number | null
  /** Empty (kerb) mass of the car, kg. */
  kerb?: number | null
  /** Trailer mass picked in the towing box, kg; the table falls back to the braked limit. */
  trailerKg?: number | null
  /** Start on the truck + semi-trailer drawing (heavy registry kinds). */
  truck?: boolean
  locale: string
}

const LAYERS = ['gvm', 'tbm', 'gtm', 'atm', 'gcm'] as const
type Layer = (typeof LAYERS)[number]
const VARIANTS = ['car', 'truck'] as const
type Variant = (typeof VARIANTS)[number]

/** Ukrainian Traffic Rules 22.5: the legal ceiling of a heavy road train on state roads, kg, and the axle ceiling. */
const TRUCK_TRAIN_KG = 40000
const TRUCK_AXLE_KG = 11500
/** Caravan-club target for the tow-ball load: about 7 % of the loaded trailer. */
const TBM_SHARE = 0.07

type Drawing = {
  /** Horizontal extent of each measured part. */
  gvm: readonly [number, number]
  gtm: readonly [number, number]
  /** Where the coupling sits (the tow ball or the kingpin). */
  coupling: number
  /** Baseline of the coupling label: above the trailer body for the tall truck. */
  couplingLabelY: number
  /** Height of the tow ball / kingpin, where the tow-ball load arrow lands. */
  couplingY: number
  /** Top of the ATM bracket (its ticks hang 8 below, its label sits 8 above). */
  atmY: number
  atm: readonly [number, number]
  gcm: readonly [number, number]
}

const GROUND = 116
const DRAWINGS: Record<Variant, Drawing> = {
  car: {
    gvm: [22, 142],
    gtm: [240, 296],
    coupling: 150,
    couplingLabelY: 68,
    couplingY: 96,
    atmY: 40,
    atm: [192, 326],
    gcm: [22, 326]
  },
  truck: {
    gvm: [18, 126],
    gtm: [312, 378],
    coupling: 96,
    couplingLabelY: 28,
    couplingY: 88,
    atmY: 8,
    atm: [84, 382],
    gcm: [18, 382]
  }
}

/** The towing SUV, nose to the left, drawn from the same outline as the size schema. */
const CAR_LEFT = 22
const CAR_LENGTH = 120

/** The caravan: a rounded box behind the car (front = left), with its window, door, roof vent and one axle. */
const CARAVAN_BODY = 'M192 104V68Q192 60 200 56L212 52H318Q326 52 326 60V104Z'
const CARAVAN_WINDOWS = ['M212 62H246Q250 62 250 66V78H212Z', 'M266 62H292V100H266Z', 'M300 62H318V76H300Z']
const CARAVAN_AXLE = 268

const TRACTOR_BODY = 'M18 102V68Q18 62 24 60L32 56L36 46Q38 42 44 42H64Q70 42 70 48V76H126V102Z M40 38L52 34H62V42H40Z'
const TRACTOR_WINDOW = 'M40 52L42 47H62V62H36Z'
const TRAILER_BODY = 'M84 94V36Q84 33 87 33H379Q382 33 382 36V94Z'
const TRAILER_RIBS = [124, 164, 204, 244, 284, 324].map(x => `M${x} 36V90`)
const TRUCK_WHEELS: readonly { x: number; r: number }[] = [
  { x: 34, r: 10 },
  { x: 104, r: 10 },
  { x: 120, r: 10 },
  { x: 322, r: 10 },
  { x: 344, r: 10 },
  { x: 366, r: 10 }
]

function OutfitArt({ variant }: { variant: Variant }): ReactNode {
  if (variant === 'truck') {
    return (
      <>
        <path d={TRACTOR_BODY} fill="currentColor" fillOpacity="0.85" />
        <path d={TRACTOR_WINDOW} fill="var(--color-bg)" fillOpacity="0.8" />
        <path d={TRAILER_BODY} fill="currentColor" fillOpacity="0.85" />
        <path d={TRAILER_RIBS.join('')} stroke="var(--color-bg)" strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
        <path d="M60 102H382" stroke="currentColor" strokeWidth="3" />

        {TRUCK_WHEELS.map(w => (
          <g key={w.x}>
            <circle cx={w.x} cy={GROUND - w.r} r={w.r + 3} fill="var(--color-bg)" />
            <Wheel cx={w.x} cy={GROUND - w.r} r={w.r} />
          </g>
        ))}
      </>
    )
  }

  const { lengthMm, heightMm, wheelbaseMm } = DRAW_TYPICAL.suv
  const { rear, front } = axlePositions('suv', lengthMm, wheelbaseMm)
  const k = CAR_LENGTH / lengthMm
  const carTop = GROUND - heightMm * k

  return (
    <>
      <g transform={`translate(${CAR_LEFT + CAR_LENGTH} ${carTop}) scale(${-k} ${k})`}>
        <SideSilhouette
          shape="suv"
          length={lengthMm}
          height={heightMm}
          rearAxle={rear}
          frontAxle={front}
          color="currentColor"
          bodyOpacity={0.85}
        />
      </g>

      <path d="M142 98H192" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d={CARAVAN_BODY} fill="currentColor" fillOpacity="0.85" />
      {CARAVAN_WINDOWS.map(path => (
        <path key={path} d={path} fill="var(--color-bg)" fillOpacity="0.8" />
      ))}
      <path d="M236 49H258V52H236Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M326 96H332V104H326Z" fill="currentColor" fillOpacity="0.6" />
      <circle cx={CARAVAN_AXLE} cy={GROUND - 11} r={14} fill="var(--color-bg)" />
      <Wheel cx={CARAVAN_AXLE} cy={GROUND - 11} r={11} />
    </>
  )
}

function Bracket({
  from,
  to,
  y,
  active,
  label
}: {
  from: number
  to: number
  y: number
  active: boolean
  label: string
}): ReactNode {
  return (
    <g className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-25')}>
      <path d={`M${from} ${y - 4}V${y}H${to}V${y - 4}`} fill="none" stroke="currentColor" strokeWidth="2" />
      <text x={(from + to) / 2} y={y + 12} textAnchor="middle" fontSize="11" fill="currentColor">
        {label}
      </text>
    </g>
  )
}

/**
 * Interactive mass schema: a car with a caravan (or a tractor with a semi-trailer) drawn with the five masses of a
 * towing outfit — GVM, tow-ball load (TBM), GTM, ATM and GCM — each a chip that lights its span on the drawing and shows
 * the definition and, where we know it, the figure. Original artwork; the definitions are the common industry ones.
 */
export default function RdwMassSchema({
  gross,
  braked,
  unbraked = null,
  kerb = null,
  trailerKg = null,
  truck = false,
  locale
}: Props): ReactNode {
  const { t } = useTranslation()
  const [variant, setVariant] = useState<Variant>(truck ? 'truck' : 'car')
  const [layer, setLayer] = useState<Layer>('gcm')
  const d = DRAWINGS[variant]
  const fmt = (kg: number): string => `${kg.toLocaleString(locale)} ${t('field.unitKg')}`

  // The outfit behind the figures: the trailer picked above, else the heaviest the car may pull with brakes.
  const chosen = trailerKg !== null
  const atm = trailerKg ?? braked
  const tbm = atm ? Math.round(atm * TBM_SHARE) : null
  const gtm = atm && tbm !== null ? atm - tbm : null
  const gcm = gross && gtm !== null ? gross + gtm : null
  const bound = chosen ? '' : '≤ '
  const carFigures: Partial<Record<Layer, string>> = {
    gvm: gross ? fmt(gross) : undefined,
    tbm: tbm !== null ? `≈ ${fmt(tbm)}` : undefined,
    gtm: gtm !== null ? `${bound}${fmt(gtm)}` : undefined,
    atm: atm ? `${bound}${fmt(atm)}` : undefined,
    gcm: gcm !== null ? `${bound}${fmt(gcm)}` : undefined
  }
  const carNotes: Partial<Record<Layer, string>> = {
    gvm: gross && kerb ? t('rdw.schema.your.gvm', { kerb: fmt(kerb), payload: fmt(gross - kerb) }) : undefined,
    tbm: tbm !== null ? t('rdw.schema.your.tbm') : undefined,
    gtm: gtm !== null && atm && tbm !== null ? t('rdw.schema.your.gtm', { atm: fmt(atm), tbm: fmt(tbm) }) : undefined,
    atm: atm
      ? chosen
        ? t(`rdw.tow.verdict.${towVerdict(atm, unbraked, braked)}`)
        : t('rdw.schema.your.atm', { unbraked: unbraked ? fmt(unbraked) : '-' })
      : undefined,
    gcm:
      gross && gtm !== null
        ? `${t('rdw.schema.your.gcm', { gvm: fmt(gross), gtm: fmt(gtm) })}${
            chosen && atm
              ? ` ${t('rdw.tow.licence', { category: t(`rdw.tow.category.${licenceFor(gross, atm)}`) })}`
              : ''
          }`
        : undefined
  }
  const truckFigures: Partial<Record<Layer, string>> = {
    gcm: `≤ ${fmt(TRUCK_TRAIN_KG)}`,
    gtm: `≤ ${fmt(TRUCK_AXLE_KG * 3)}`
  }
  const figure = (variant === 'truck' ? truckFigures : carFigures)[layer]
  const label = (key: Layer): string => t(`rdw.schema.short.${key}`)

  return (
    <details open className="mt-2 text-sm">
      <summary className="cursor-pointer text-[var(--color-primary)]">📐 {t('rdw.schema.title')}</summary>

      <div className="mt-2 flex gap-1.5">
        {VARIANTS.map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={variant === v}
            onClick={() => setVariant(v)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs',
              variant === v
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/40'
            )}
          >
            {t(`rdw.schema.variant.${v}`)}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 -10 400 170"
        role="img"
        aria-label={t(`rdw.schema.alt.${variant}`)}
        className="mt-2 w-full max-w-md text-[var(--color-fg)]"
      >
        <line x1="4" x2="396" y1={GROUND} y2={GROUND} stroke="currentColor" strokeOpacity="0.3" />

        <OutfitArt variant={variant} />

        <Bracket from={d.gvm[0]} to={d.gvm[1]} y={126} active={layer === 'gvm'} label={label('gvm')} />
        <Bracket from={d.gtm[0]} to={d.gtm[1]} y={126} active={layer === 'gtm'} label={label('gtm')} />
        <Bracket from={d.gcm[0]} to={d.gcm[1]} y={144} active={layer === 'gcm'} label={label('gcm')} />

        <g className={cn('transition-opacity', layer === 'atm' ? 'opacity-100' : 'opacity-25')}>
          <path
            d={`M${d.atm[0]} ${d.atmY + 8}V${d.atmY}H${d.atm[1]}V${d.atmY + 8}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x={(d.atm[0] + d.atm[1]) / 2} y={d.atmY - 8} textAnchor="middle" fontSize="11" fill="currentColor">
            {label('atm')}
          </text>
        </g>

        <g className={cn('transition-opacity', layer === 'tbm' ? 'opacity-100' : 'opacity-25')}>
          <path
            d={`M${d.coupling} ${d.couplingLabelY + 6}V${d.couplingY}m-5-6 5 6 5-6`}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
          />
          <text x={d.coupling} y={d.couplingLabelY} textAnchor="middle" fontSize="11" fill="currentColor">
            {label('tbm')}
          </text>
        </g>
      </svg>

      <div className="mt-1 flex flex-wrap gap-1.5">
        {LAYERS.map(key => (
          <button
            key={key}
            type="button"
            aria-pressed={layer === key}
            onClick={() => setLayer(key)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs',
              layer === key
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/40'
            )}
          >
            {label(key)}
          </button>
        ))}
      </div>

      <p className="mt-2">
        <strong>{t(`rdw.schema.name.${layer}`)}.</strong>{' '}
        {t(variant === 'truck' && layer === 'tbm' ? 'rdw.schema.desc.tbmTruck' : `rdw.schema.desc.${layer}`)}
        {figure && <span className="ml-1 font-medium">{figure}</span>}
      </p>

      {variant === 'car' && atm && (
        <div className="mt-2 rounded-lg bg-[var(--color-surface)]/20 p-2">
          <p className="text-xs font-medium">
            {chosen ? t('rdw.schema.your.chosen', { kg: fmt(atm) }) : t('rdw.schema.your.maxBraked', { kg: fmt(atm) })}
          </p>

          <ul className="mt-1 space-y-0.5">
            {LAYERS.filter(key => carFigures[key]).map(key => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setLayer(key)}
                  className={cn(
                    'w-full rounded px-1.5 py-0.5 text-left text-xs transition-colors',
                    layer === key ? 'bg-[var(--color-primary)]/15' : 'hover:bg-[var(--color-border)]/40'
                  )}
                >
                  <span className="inline-block w-10 font-medium">{label(key)}</span>
                  <span className="font-medium">{carFigures[key]}</span>
                  {carNotes[key] && <span className="ml-1.5 text-[var(--color-muted)]">{carNotes[key]}</span>}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-1 text-xs text-[var(--color-muted)]">{t('rdw.schema.your.relations')}</p>
        </div>
      )}
    </details>
  )
}
