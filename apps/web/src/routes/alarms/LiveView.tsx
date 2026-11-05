import { lazy } from 'react'
import type { ReactNode } from 'react'
import type { AlarmsResponse } from '@carplates/shared'

import ActiveAlarmList from '@/routes/alarms/ActiveAlarmList'
import AlarmMapCard from '@/routes/alarms/AlarmMapCard'
import LazySection from '@/components/LazySection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { sortedAlarms } from '@/routes/alarms/helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

const AlarmStatsSection = lazy(() => import('@/routes/alarms/AlarmStatsSection'))
const AlarmHistorySection = lazy(() => import('@/routes/alarms/AlarmHistorySection'))
const LossesSection = lazy(() => import('@/routes/alarms/LossesSection'))

type Props = {
  data: AlarmsResponse | undefined
  isPending: boolean
  isError: boolean
}

/** The classic `/alarms` view: live map + active list, today's numbers, war losses and history. */
export default function LiveView({ data, isPending, isError }: Props): ReactNode {
  return (
    <>
      <AlarmMapCard data={data} isPending={isPending} isError={isError}>
        {data && <ActiveAlarmList regions={sortedAlarms(data.regions)} nowIso={data.fetchedAt} />}
      </AlarmMapCard>

      {/* Own recorder: shows even when the live feed is down (it answers from the database). */}
      <LazySection fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <AlarmStatsSection />
        </LoadErrorBoundary>
      </LazySection>

      {/* War-loss figures come from our own daily copy, so they show even when the live feed is down. */}
      <LazySection sections={['losses']} fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <LossesSection />
        </LoadErrorBoundary>
      </LazySection>

      {/* History comes from our own table, so it shows even when the live feed is down. */}
      <LazySection fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <AlarmHistorySection />
        </LoadErrorBoundary>
      </LazySection>
    </>
  )
}
