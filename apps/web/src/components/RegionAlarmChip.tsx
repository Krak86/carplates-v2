import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { alarmsQuery } from '@/lib/queries'

type Props = {
  region: string | null
}

/**
 * "Air raid alert in the region" chip. Online-only, informational. Renders nothing without a region, while loading, when
 * /api/alarms fails (503 = no or stale data) or when the region has no alert: never "no alert" from missing data.
 */
export default function RegionAlarmChip({ region }: Props): ReactNode {
  const { t } = useTranslation()
  const alarms = useQuery({ ...alarmsQuery(), enabled: !!region })
  const alarm = region ? alarms.data?.regions.find(r => r.region === region) : undefined
  if (!alarm) return null

  const title = [t('result.alarmTitle'), alarm.level ? t('result.alarmLevel', { level: alarm.level }) : null]
    .filter(Boolean)
    .join(' ')

  return (
    <Link
      viewTransition
      to="/alarms"
      title={title}
      className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-2 pl-2 text-xs text-fg transition-colors chip-safety hover:brightness-110"
    >
      <span aria-hidden>🚨</span>
      {alarm.scope === 'full' ? t('result.alarmFull') : t('result.alarmPartial')}
    </Link>
  )
}
