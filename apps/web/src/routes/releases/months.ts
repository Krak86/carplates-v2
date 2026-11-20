import { queryOptions } from '@tanstack/react-query'
import { RELEASE_MONTHS } from '@carplates/shared/releases/core'
import type { ReleaseDay, ReleaseItem, ReleaseMonth } from '@carplates/shared/releases/core'

type MonthModule = { DAYS: readonly ReleaseDay[] }

// One lazy chunk per month, loaded when the month is opened. `Record<ReleaseMonth, ...>` makes a month missing from
// this map a type error, so a new `releases/<yyyy-mm>.ts` file cannot be forgotten here.
const LOADERS: Record<ReleaseMonth, () => Promise<MonthModule>> = {
  '2026-11': () => import('@carplates/shared/releases/2026-11'),
  '2026-10': () => import('@carplates/shared/releases/2026-10'),
  '2026-09': () => import('@carplates/shared/releases/2026-09')
}

export { RELEASE_MONTHS }
export type { ReleaseMonth }

const newestFirst = (days: readonly ReleaseDay[]): ReleaseDay[] =>
  [...days].sort((a, b) => b.date.localeCompare(a.date))

/** The days of one month, newest first. The log never changes within a deploy, so it is cached for good. */
export const releaseMonthQuery = (month: ReleaseMonth) =>
  queryOptions({
    queryKey: ['releases', month] as const,
    queryFn: async () => newestFirst((await LOADERS[month]()).DAYS),
    staleTime: Infinity
  })

export type LatestReleaseItem = { date: string; item: ReleaseItem }

/** The newest `max` items across days; reads further months only when the newest one has too few. */
export const latestReleaseItemsQuery = (max: number) =>
  queryOptions({
    queryKey: ['releases', 'latest', max] as const,
    queryFn: async () => {
      const out: LatestReleaseItem[] = []
      for (const month of RELEASE_MONTHS) {
        const days = newestFirst((await LOADERS[month]()).DAYS)
        for (const day of days) for (const item of day.items) out.push({ date: day.date, item })
        if (out.length >= max) break
      }
      return out.slice(0, max)
    },
    staleTime: Infinity
  })
