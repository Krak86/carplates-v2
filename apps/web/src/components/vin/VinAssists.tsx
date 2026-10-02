import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ASSISTS, assistLevel } from '@/components/vin/helpers'
import type { FieldMap } from '@/components/vin/helpers'
import { cn } from '@/lib/cn'

type Props = {
  fields: FieldMap
}

/** Driver-assist and safety equipment as chips: filled = standard, dashed = optional. Absent ones are left out. */
export default function VinAssists({ fields }: Props): ReactNode {
  const { t } = useTranslation()
  const present = ASSISTS.flatMap(a => {
    const level = assistLevel(fields.get(a.variable))
    return level ? [{ ...a, level }] : []
  })
  if (present.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1.5">
      {present.map(a => (
        <li
          key={a.key}
          title={t(`vin.level.${a.level}`)}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-sm',
            a.level === 'standard'
              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : 'border border-dashed border-[var(--color-muted)] text-[var(--color-muted)]'
          )}
        >
          {a.level === 'standard' ? '✓' : '○'} {t(`vin.assist.${a.key}`)}
        </li>
      ))}
    </ul>
  )
}
