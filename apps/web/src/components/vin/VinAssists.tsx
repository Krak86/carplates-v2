import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ASSISTS, assistLevel, saeLevelRange } from '@/components/vin/helpers'
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
  const sae = saeLevelRange(fields)
  if (present.length === 0 && !sae) return null

  return (
    <div className="space-y-2">
      {sae && (
        <p className="text-sm">
          {t('vin.assist.sae', { level: sae.from === sae.to ? `${sae.to}` : `${sae.from}-${sae.to}` })}
        </p>
      )}

      {present.length > 0 && (
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
      )}

      <p className="text-xs text-[var(--color-muted)]">{t('vin.assists.note')}</p>
    </div>
  )
}
