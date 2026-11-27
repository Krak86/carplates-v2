import { z } from 'zod'
import type { AdminLogsQuery } from '@carplates/shared'

/** Loki `query_range`: `values` are `[unix-ns string, line]` (Loki 3 may append structured metadata, ignored here). */
export const lokiStreamsSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    result: z.array(
      z.object({
        stream: z.record(z.string(), z.string()),
        values: z.array(z.tuple([z.string().regex(/^\d+$/), z.string()]).rest(z.unknown()))
      })
    )
  })
})

/** Loki label values: `{ status, data: string[] }`. */
export const lokiLabelValuesSchema = z.object({ status: z.literal('success'), data: z.array(z.string()) })

/** A request window after defaults and the 24 h cap, in epoch milliseconds. */
export type LogWindow = { fromMs: number; toMs: number }

/** The fields the LogQL builder reads (the rest of the query is window + paging). */
export type LogFilter = Pick<AdminLogsQuery, 'container' | 'level' | 'q'>
