import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { SIZE_CLASSES } from '@/components/size/VehicleSize.helpers'
import { fleetBySegment, formatCount, pick, type ModelProfile } from '@/routes/read/helpers'
import { FLEET_NOTE } from '@/routes/read/sizes/content'

type Props = {
  profiles: readonly ModelProfile[]
}

/** How the Ukrainian passenger fleet splits across the segments (cars of models with a known length). */
export default function FleetBySegment({ profiles }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { byClass, unplaced } = fleetBySegment(profiles)
  const placed = [...byClass.values()].reduce((sum, n) => sum + n, 0)
  const biggest = Math.max(1, ...byClass.values())
  const classes = SIZE_CLASSES.filter(cls => byClass.has(cls))

  return (
    <Card id="fleet" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.sec.fleet')}</h2>

      <ul className="space-y-1.5">
        {classes.map(cls => {
          const n = byClass.get(cls) ?? 0
          return (
            <li key={cls} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate">{t(`size.class.${cls}`)}</span>
              <span aria-hidden className="h-3 rounded-full bg-(--color-bg)">
                <span
                  className="block h-3 rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (n / biggest) * 100)}%` }}
                />
              </span>
              <span className="tabular-nums">
                {Math.round((n / placed) * 100)}% · {formatCount(n, i18n.language)}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-sm text-muted">
        {pick(FLEET_NOTE, i18n.language)} {t('read.fleet.unplaced', { n: formatCount(unplaced, i18n.language) })}
      </p>
    </Card>
  )
}
