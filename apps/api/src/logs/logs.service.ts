import { Injectable, Logger } from '@nestjs/common'
import { LOG_LEVELS, adminLogContainersResponseSchema, adminLogsResponseSchema, redactLogText } from '@carplates/shared'
import type {
  AdminLogContainersResponse,
  AdminLogLine,
  AdminLogsQuery,
  AdminLogsResponse,
  LogLevel
} from '@carplates/shared'
import type { ZodType } from 'zod'

import { loadEnv, lokiEnabled } from '../env.js'

import { buildLogql, msToNs, nsToIso, resolveWindow } from './helpers.js'
import { lokiLabelValuesSchema, lokiStreamsSchema } from './types.js'

const LOKI_TIMEOUT_MS = 8_000
/** Container names seen in the last day fill the filter select. */
const CONTAINERS_LOOKBACK_MS = 24 * 60 * 60_000

const isLevel = (value: string | undefined): value is LogLevel => LOG_LEVELS.some(level => level === value)

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name)

  async query(query: AdminLogsQuery, adminId: string): Promise<AdminLogsResponse> {
    const { fromMs, toMs } = resolveWindow(query.from, query.to)
    const window = { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() }
    const logql = buildLogql(query)
    // Audit trail: who searched for what. `q` is masked inside `logql`; the explicit pass covers every other field too.
    this.logger.log(
      redactLogText(
        `admin logs query ${JSON.stringify({ admin: adminId, logql, ...window, limit: query.limit, direction: query.direction })}`
      )
    )

    const env = loadEnv()
    if (!lokiEnabled(env)) return { status: 'disabled', lines: [], truncated: false, ...window }

    // One extra line tells "exactly limit matched" from "more matched".
    const body = await this.lokiGet(
      env.LOKI_URL,
      '/loki/api/v1/query_range',
      {
        query: logql,
        start: msToNs(fromMs),
        end: msToNs(toMs),
        limit: String(query.limit + 1),
        direction: query.direction
      },
      lokiStreamsSchema
    )
    if (!body) return { status: 'unavailable', lines: [], truncated: false, ...window }

    const entries = body.data.result.flatMap(({ stream, values }) =>
      values.map(([ns, line]) => ({
        ns: BigInt(ns),
        container: stream.container ?? 'unknown',
        level: isLevel(stream.level) ? stream.level : ('info' as const),
        line
      }))
    )
    entries.sort((a, b) => (a.ns === b.ns ? 0 : a.ns < b.ns === (query.direction === 'forward') ? -1 : 1))
    const lines: AdminLogLine[] = entries.slice(0, query.limit).map(entry => ({
      ts: nsToIso(entry.ns.toString()),
      container: entry.container,
      level: entry.level,
      // Loki only holds masked text; a second pass is cheap insurance against a Vector rule that missed a shape.
      message: redactLogText(entry.line)
    }))
    return adminLogsResponseSchema.parse({ status: 'ok', lines, truncated: entries.length > query.limit, ...window })
  }

  async containers(): Promise<AdminLogContainersResponse> {
    const env = loadEnv()
    if (!lokiEnabled(env)) return { status: 'disabled', containers: [] }
    const now = Date.now()
    const body = await this.lokiGet(
      env.LOKI_URL,
      '/loki/api/v1/label/container/values',
      { start: msToNs(now - CONTAINERS_LOOKBACK_MS), end: msToNs(now) },
      lokiLabelValuesSchema
    )
    if (!body) return { status: 'unavailable', containers: [] }
    return adminLogContainersResponseSchema.parse({ status: 'ok', containers: [...body.data].sort() })
  }

  /** GET + Zod-parse; any failure (down, slow, non-2xx, unexpected shape) is logged once and returns null. */
  private async lokiGet<T>(
    baseUrl: string | undefined,
    path: string,
    params: Record<string, string>,
    schema: ZodType<T>
  ): Promise<T | null> {
    try {
      const url = new URL(path, baseUrl)
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
      const res = await fetch(url, {
        signal: AbortSignal.timeout(LOKI_TIMEOUT_MS),
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) {
        this.logger.warn(`Loki answered ${res.status} for ${path}`)
        return null
      }
      const parsed = schema.safeParse(await res.json())
      if (!parsed.success) {
        this.logger.warn(`Loki answer for ${path} has an unexpected shape`)
        return null
      }
      return parsed.data
    } catch (err) {
      this.logger.warn(`Loki is unreachable for ${path}: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
