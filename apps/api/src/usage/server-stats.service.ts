import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { statfs } from 'node:fs/promises'
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { AdminServerResponse, ServerSample } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

const SAMPLE_INTERVAL_MS = 60_000
/** 24 h of one-minute samples. */
const MAX_SAMPLES = 1440

type CpuTimes = { idle: number; total: number }

function readCpuTimes(): CpuTimes {
  let idle = 0
  let total = 0
  for (const { times } of os.cpus()) {
    idle += times.idle
    total += times.user + times.nice + times.sys + times.idle + times.irq
  }
  return { idle, total }
}

/** MemAvailable counts reclaimable cache as free; os.freemem() on Linux does not, so it would read ~100% used. */
async function readMemUsedBytes(): Promise<number> {
  try {
    const meminfo = await readFile('/proc/meminfo', 'utf8')
    const available = /^MemAvailable:\s+(\d+) kB/m.exec(meminfo)?.[1]
    if (available) return os.totalmem() - Number(available) * 1024
  } catch {
    // not Linux
  }
  return os.totalmem() - os.freemem()
}

@Injectable()
export class ServerStatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerStatsService.name)
  private readonly samples: ServerSample[] = []
  private previous = readCpuTimes()
  private timer: NodeJS.Timeout | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sample(), SAMPLE_INTERVAL_MS)
    this.timer.unref()
    void this.sample()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async sample(): Promise<void> {
    try {
      const now = readCpuTimes()
      const totalDelta = now.total - this.previous.total
      const idleDelta = now.idle - this.previous.idle
      this.previous = now
      this.samples.push({
        at: Date.now(),
        cpuPercent: totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 1000) / 10 : 0,
        memUsedBytes: await readMemUsedBytes(),
        processRssBytes: process.memoryUsage.rss(),
        load1: os.loadavg()[0] ?? 0
      })
      if (this.samples.length > MAX_SAMPLES) this.samples.splice(0, this.samples.length - MAX_SAMPLES)
    } catch (err) {
      this.logger.warn(`server sample dropped: ${String(err)}`)
    }
  }

  async snapshot(): Promise<AdminServerResponse> {
    const db = this.dbService.db
    const [dbRows, disk] = await Promise.all([
      db
        .execute<{ users: number; db_size: number; connections: number }>(
          sql`SELECT (SELECT count(*) FROM app.users)::float8 AS users,
                     pg_database_size(current_database())::float8 AS db_size,
                     (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())::float8 AS connections`
        )
        .catch(() => null),
      statfs('/').catch(() => null)
    ])
    const row = dbRows?.rows[0]
    const [load1 = 0, load5 = 0, load15 = 0] = os.loadavg()

    return {
      cpuCores: os.availableParallelism(),
      cpuModel: os.cpus()[0]?.model.trim() ?? '',
      memTotalBytes: os.totalmem(),
      diskTotalBytes: disk ? disk.blocks * disk.bsize : null,
      diskUsedBytes: disk ? (disk.blocks - disk.bfree) * disk.bsize : null,
      uptimeSeconds: os.uptime(),
      processUptimeSeconds: process.uptime(),
      load: [load1, load5, load15],
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()}`,
      users: row?.users ?? 0,
      dbSizeBytes: row?.db_size ?? null,
      dbConnections: row?.connections ?? null,
      samples: [...this.samples]
    }
  }
}
