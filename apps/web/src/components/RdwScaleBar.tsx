import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { scaleClass, scalePosition, type SpecRange, type SpecScale } from '@/components/RdwSpecs.helpers'

type Props = {
  scale: SpecScale
  range: SpecRange
  unit: string
}

const toPercent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`

/** Where a model's figure sits among typical cars: class ticks on a track, the model's min–max shaded, a dot at the median. */
export default function RdwScaleBar({ scale, range, unit }: Props): ReactNode {
  const { t } = useTranslation()
  const label = t(`rdw.${scale.labels}.${scaleClass(scale, range.median)}`)
  const from = scalePosition(scale, range.min)
  const to = scalePosition(scale, range.max)
  const scaleHint = `${scale.min}–${scale.max} ${unit}`.trim()

  return (
    <span className="mt-1 flex w-40 flex-col items-end gap-0.5" title={t('rdw.scaleHint', { scale: scaleHint })}>
      <span className="relative block h-1.5 w-full rounded-full bg-[var(--color-border)]" aria-hidden>
        <span
          className="absolute inset-y-0 rounded-full bg-[var(--color-primary)]/30"
          style={{ left: toPercent(from), width: toPercent(Math.max(to - from, 0.01)) }}
        />

        {scale.cuts.map(cut => (
          <span
            key={cut}
            className="absolute inset-y-0 w-px bg-[var(--color-surface)]"
            style={{ left: toPercent(scalePosition(scale, cut)) }}
          />
        ))}

        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]"
          style={{ left: toPercent(scalePosition(scale, range.median)) }}
        />
      </span>

      <span className="text-xs text-[var(--color-muted)]">{label}</span>
    </span>
  )
}
