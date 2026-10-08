import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { assistLevel } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'

type Props = {
  fields: FieldMap
}

/** Top-down motorcycle outline with the facts a bike decode actually carries as chips (seats, chassis, suspension, ABS). */
export default function VinMotorcycleSchematic({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const seats = Number(fields.get('Number of Seats'))
  const hasPillion = seats >= 2
  const abs = assistLevel(fields.get('Antilock Braking System (ABS)'))
  const chips = [
    seats >= 1 ? t('vin.moto.seats', { count: seats }) : undefined,
    fields.get('Motorcycle Chassis Type'),
    fields.get('Motorcycle Suspension Type'),
    fields.get('Custom Motorcycle Type'),
    abs ? `ABS · ${t(`vin.level.${abs}`)}` : undefined
  ].filter((c): c is string => !!c)

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg viewBox="0 0 120 300" role="img" aria-label={t('vin.car.title')} className="h-64 w-auto shrink-0">
        {/* wheels */}
        <rect x={52} y={14} width={16} height={58} rx={8} className="fill-[var(--color-fg)]/70" />
        <rect x={50} y={226} width={20} height={62} rx={10} className="fill-[var(--color-fg)]/70" />

        {/* frame spine + fork */}
        <g className="stroke-[var(--color-muted)]" strokeWidth={4} strokeLinecap="round">
          <line x1={60} y1={48} x2={60} y2={96} />
          <line x1={60} y1={160} x2={60} y2={250} />
        </g>

        {/* handlebar with grips */}
        <g className="stroke-[var(--color-muted)]" strokeWidth={5} strokeLinecap="round">
          <line x1={22} y1={92} x2={98} y2={92} />
        </g>
        <circle cx={20} cy={92} r={5} className="fill-[var(--color-fg)]/70" />
        <circle cx={100} cy={92} r={5} className="fill-[var(--color-fg)]/70" />

        {/* headlight, tank, engine block */}
        <circle cx={60} cy={34} r={6} className="fill-amber-400/60" />
        <path
          d="M 44 104 Q 60 96 76 104 L 80 148 Q 60 158 40 148 Z"
          className="fill-[var(--color-surface)] stroke-[var(--color-muted)]"
          strokeWidth={2}
        />
        <rect
          x={46}
          y={162}
          width={28}
          height={30}
          rx={6}
          className="fill-[var(--color-primary)]/25 stroke-[var(--color-primary)]"
        />

        {/* rider seat, pillion seat */}
        <rect
          x={46}
          y={196}
          width={28}
          height={30}
          rx={10}
          className="fill-[var(--color-border)] stroke-[var(--color-muted)]/70"
        />
        {hasPillion && (
          <rect
            x={48}
            y={228}
            width={24}
            height={20}
            rx={8}
            className="fill-[var(--color-border)] stroke-[var(--color-muted)]/70"
          />
        )}
      </svg>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
