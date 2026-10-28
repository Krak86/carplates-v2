/**
 * Runs one scheduled ingest job (see `jobs.ts`) the way cron should: one at a time, with a time limit, a run-log row in
 * `registry.job_runs` and a healthchecks.io ping. Invoked by `infra/vps/run-ingest.sh` inside the ingest image.
 *
 *   tsx src/run-job.ts news
 *
 * - Non-overlapping: a session advisory lock per job; if it is held (a previous run is still going) this exits 0 without running.
 * - Hard timeout: the whole process group is killed (SIGTERM, then SIGKILL after 30 s); the run is logged `timeout`.
 * - Dead-man's switch: pings `$HC_PING_<JOB>` at `/start`, on success and on `/fail`; a missing variable skips pinging.
 * Exit code: 0 on success or when skipped, 1 on failure or timeout.
 */
import { spawn } from 'node:child_process'

import { createDb, jobRuns } from '@carplates/db'
import { eq, sql } from 'drizzle-orm'

import { isJobName, JOBS, pingEnvVar } from './jobs.js'
import type { JobName } from './jobs.js'

const KILL_GRACE_MS = 30_000
const PING_TIMEOUT_MS = 10_000
const MAX_ERROR_CHARS = 2000

type Outcome = { status: 'ok' | 'failed' | 'timeout'; exitCode: number | null; error?: string }

async function ping(job: string, suffix: '' | '/start' | '/fail'): Promise<void> {
  const base = process.env[pingEnvVar(job)]
  if (!base) return
  try {
    await fetch(`${base}${suffix}`, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) })
  } catch (err) {
    console.warn(`warn: healthcheck ping failed (${err instanceof Error ? err.message : String(err)})`)
  }
}

function runCommand(command: string, timeoutMin: number): Promise<Outcome> {
  return new Promise(resolve => {
    // detached = own process group, so the timeout can take down the shell AND the tsx/node children under it.
    const child = spawn(command, { shell: true, stdio: 'inherit', detached: true })
    let timedOut = false
    let killTimer: NodeJS.Timeout | undefined
    const killGroup = (signal: NodeJS.Signals): void => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, signal)
      } catch {
        // already gone
      }
    }
    const timer = setTimeout(() => {
      timedOut = true
      console.error(`timeout: ${command} exceeded ${String(timeoutMin)} min, terminating`)
      killGroup('SIGTERM')
      killTimer = setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS)
    }, timeoutMin * 60_000)
    const finish = (outcome: Outcome): void => {
      clearTimeout(timer)
      clearTimeout(killTimer)
      resolve(outcome)
    }
    child.on('error', err => finish({ status: 'failed', exitCode: null, error: err.message }))
    child.on('close', (code, signal) => {
      if (timedOut) finish({ status: 'timeout', exitCode: code, error: `timed out after ${String(timeoutMin)} min` })
      else if (code === 0) finish({ status: 'ok', exitCode: 0 })
      else finish({ status: 'failed', exitCode: code, error: `exited with ${String(code ?? signal)}` })
    })
  })
}

async function main(): Promise<number> {
  const name = process.argv[2]
  if (!name || !isJobName(name)) {
    console.error(`usage: tsx src/run-job.ts <${Object.keys(JOBS).join('|')}>`)
    return 2
  }
  const jobName: JobName = name
  const { command, timeoutMin } = JOBS[jobName]
  const { db, pool, close } = createDb()
  // The lock is per session, so hold a dedicated connection for the whole run (the pool may hand out others).
  const lockClient = await pool.connect()
  try {
    const lock = await lockClient.query<{ locked: boolean }>(`SELECT pg_try_advisory_lock(hashtext($1)) AS locked`, [
      `job:${jobName}`
    ])
    if (!lock.rows[0]?.locked) {
      console.log(`${jobName}: previous run still holds the lock, skipping`)
      return 0
    }

    // Holding the lock means no live run exists, so any row still `running` was killed mid-way (container stop, host reboot).
    await db
      .update(jobRuns)
      .set({ status: 'abandoned', finishedAt: sql`now()` })
      .where(sql`${jobRuns.job} = ${jobName} AND ${jobRuns.status} = 'running'`)
    const [run] = await db.insert(jobRuns).values({ job: jobName }).returning({ id: jobRuns.id })
    await ping(jobName, '/start')
    console.log(`${jobName}: ${command}`)

    const outcome = await runCommand(command, timeoutMin)
    await db
      .update(jobRuns)
      .set({
        status: outcome.status,
        exitCode: outcome.exitCode,
        error: outcome.error?.slice(0, MAX_ERROR_CHARS) ?? null,
        finishedAt: sql`now()`
      })
      .where(eq(jobRuns.id, run?.id ?? -1))
    if (outcome.status === 'ok') {
      await ping(jobName, '')
      console.log(`${jobName}: ok`)
      return 0
    }
    await ping(jobName, '/fail')
    console.error(`${jobName}: ${outcome.status} (${outcome.error ?? ''})`)
    return 1
  } finally {
    lockClient.release()
    await close()
  }
}

main().then(
  code => process.exit(code),
  (err: unknown) => {
    console.error(err)
    process.exit(1)
  }
)
