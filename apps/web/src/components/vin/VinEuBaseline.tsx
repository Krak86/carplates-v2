import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { gsr2Baseline } from '@/components/vin/gsr2'
import { cn } from '@/lib/cn'

type Props = {
  /** Model year of an EU-market car; null when unknown. */
  year: number | null
}

/** "Mandatory since" chips from EU Regulation 2019/2144 for the car's year. A legal baseline, never the car's equipment. */
export default function VinEuBaseline({ year }: Props): ReactNode {
  const { t } = useTranslation()
  const items = gsr2Baseline(year)
  const status = items[0]?.status
  if (!status) return null

  return (
    <div className="space-y-2">
      <h4 className="m-0 text-sm font-semibold">{t('vin.eu.title', { year })}</h4>

      <p className="m-0 text-sm">{t(`vin.eu.status.${status}`)}</p>

      <ul className="flex flex-wrap gap-1.5">
        {items.map(s => (
          <li
            key={s.key}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-sm',
              s.status === 'all'
                ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                : 'border border-dashed border-[var(--color-muted)] text-[var(--color-muted)]'
            )}
          >
            {s.status === 'all' ? '§' : '○'} {t(`vin.eu.${s.key}`)}
          </li>
        ))}
      </ul>

      <p className="m-0 text-xs text-[var(--color-muted)]">{t('vin.eu.note')}</p>
    </div>
  )
}
