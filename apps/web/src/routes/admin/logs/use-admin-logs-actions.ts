import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { DEFAULT_LOG_LINES, LOG_MAX_LINES } from '@carplates/shared'
import type { AdminLogsResponse, LogLevel } from '@carplates/shared'

import { getAdminLogs } from '@/lib/api'
import { adminLogContainersQuery, adminLogsQuery, adminLogsRequest } from '@/lib/queries'
import type { AdminLogsParams } from '@/lib/queries'
import { applyParams, DEFAULT_RANGE, LIVE_INTERVAL_MS, mergeLiveLines, parseFilters, presetMs } from './helpers'
import type { RangeId } from './helpers'

/** Filter state lives in the URL (shareable between admins); the query and the live polling hang off it. */
export function useAdminLogsActions() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)

  const params: AdminLogsParams = {
    container: filters.container,
    level: filters.levels.length > 0 ? filters.levels.join(',') : undefined,
    q: filters.q || undefined,
    limit: filters.live ? LOG_MAX_LINES : DEFAULT_LOG_LINES,
    direction: 'backward',
    ...(filters.range === 'custom' ? { from: filters.from, to: filters.to } : { windowMs: presetMs(filters.range) })
  }
  const base = adminLogsQuery(params)

  const logs = useQuery(
    queryOptions({
      queryKey: base.queryKey,
      // Live: ask only for what is newer than the newest line on screen and merge it in.
      queryFn: async (): Promise<AdminLogsResponse> => {
        const previous = filters.live ? queryClient.getQueryData(base.queryKey) : undefined
        const newest = previous?.status === 'ok' ? previous.lines[0] : undefined
        if (!previous || !newest) return getAdminLogs(adminLogsRequest(params))
        const next = await getAdminLogs({ ...adminLogsRequest(params), from: newest.ts })
        return next.status === 'ok' ? mergeLiveLines(previous, next) : next
      },
      refetchInterval: filters.live ? LIVE_INTERVAL_MS : false
    })
  )
  const containers = useQuery(adminLogContainersQuery())

  const update = (patch: Record<string, string | undefined>): void =>
    setSearchParams(current => applyParams(current, patch), { replace: true })

  return {
    filters,
    logs,
    containers: containers.data?.status === 'ok' ? containers.data.containers : [],
    setContainer: (container: string): void => update({ container: container || undefined }),
    toggleLevel: (level: LogLevel): void => {
      const next = filters.levels.includes(level) ? filters.levels.filter(l => l !== level) : [...filters.levels, level]
      update({ level: next.join(',') || undefined })
    },
    setQuery: (q: string): void => update({ q: q.trim() || undefined }),
    setRange: (range: RangeId): void => {
      const custom = range === 'custom'
      update({
        range: range === DEFAULT_RANGE ? undefined : range,
        from: custom ? filters.from : undefined,
        to: custom ? filters.to : undefined,
        live: filters.live && !custom ? '1' : undefined
      })
    },
    setCustom: (from: string | undefined, to: string | undefined): void => update({ range: 'custom', from, to }),
    setLive: (live: boolean): void => update({ live: live ? '1' : undefined })
  }
}
