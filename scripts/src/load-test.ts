/**
 * Stepped load test for `GET /api/plate/:plate` (cold-cache lookups are the real load: they hit Postgres).
 * Dependency-free (global `fetch`); needs a plates file so requests are not all the same cached plate.
 *
 *   pnpm load-test --sample 5000 --out plates.txt                      # sample real plates from DATABASE_URL
 *   pnpm load-test --plates plates.txt --base-url http://localhost:3000 # run (default stages 5,20,50,100)
 *
 * Flags: --stages 5,20,50 · --stage-seconds 60 · --max-p95-ms 1000 · --max-error-pct 1 · --allow-remote
 *
 * Run it against the origin, not through Cloudflare: the per-IP Nest throttle (100/min) and the WAF rule (30/10 s)
 * would answer 429 almost at once. Use an SSH tunnel to the api container or a restored copy (docs/deploy.md
 * "Load testing"). A non-local --base-url needs --allow-remote. Stops at the first stage over a threshold.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { createDb } from '@carplates/db'
import { sql } from 'drizzle-orm'

const { values } = parseArgs({
  options: {
    sample: { type: 'string' },
    out: { type: 'string', default: 'plates.txt' },
    plates: { type: 'string' },
    'base-url': { type: 'string', default: 'http://localhost:3000' },
    stages: { type: 'string', default: '5,20,50,100' },
    'stage-seconds': { type: 'string', default: '60' },
    'max-p95-ms': { type: 'string', default: '1000' },
    'max-error-pct': { type: 'string', default: '1' },
    'allow-remote': { type: 'boolean', default: false }
  }
})

async function samplePlates(count: number, file: string): Promise<void> {
  const { db, close } = createDb()
  try {
    // ~0.2% block sample of the 20M+ row matview, then shuffled: random cold rows without a full scan.
    const res = await db.execute<{ plate: string }>(
      sql`SELECT plate FROM registry.current_registration TABLESAMPLE SYSTEM (0.2)
          WHERE plate IS NOT NULL ORDER BY random() LIMIT ${count}`
    )
    await writeFile(file, res.rows.map(r => r.plate).join('\n'))
    console.log(`wrote ${res.rows.length} plates to ${file}`)
  } finally {
    await close()
  }
}

type StageResult = {
  users: number
  rps: number
  p50: number
  p95: number
  p99: number
  errorPct: number
  throttled: number
}

function percentile(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0
}

async function runStage(base: string, plates: string[], users: number, seconds: number): Promise<StageResult> {
  const latencies: number[] = []
  let errors = 0
  let throttled = 0
  const deadline = Date.now() + seconds * 1000

  async function worker(): Promise<void> {
    while (Date.now() < deadline) {
      const plate = plates[Math.floor(Math.random() * plates.length)]!
      const started = performance.now()
      try {
        const res = await fetch(`${base}/api/plate/${encodeURIComponent(plate)}`, {
          headers: { 'user-agent': 'carsua-load-test' },
          signal: AbortSignal.timeout(10_000)
        })
        await res.arrayBuffer()
        if (res.status === 429) throttled++
        else if (res.status >= 500) errors++
        latencies.push(performance.now() - started)
      } catch {
        errors++
      }
    }
  }

  await Promise.all(Array.from({ length: users }, worker))
  const sorted = latencies.sort((a, b) => a - b)
  const total = sorted.length + errors
  return {
    users,
    rps: Math.round((sorted.length / seconds) * 10) / 10,
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
    errorPct: total ? Math.round((errors / total) * 1000) / 10 : 0,
    throttled
  }
}

async function main(): Promise<void> {
  if (values.sample) {
    await samplePlates(Number(values.sample), values.out!)
    return
  }
  if (!values.plates) throw new Error('pass --plates <file> (or --sample N to create one)')

  const base = values['base-url']!.replace(/\/$/, '')
  const host = new URL(base).hostname
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && !values['allow-remote']) {
    throw new Error(`refusing non-local target ${host} without --allow-remote`)
  }

  const plates = (await readFile(values.plates, 'utf8')).split(/\r?\n/).filter(Boolean)
  const stages = values.stages!.split(',').map(Number)
  const seconds = Number(values['stage-seconds'])
  const maxP95 = Number(values['max-p95-ms'])
  const maxErr = Number(values['max-error-pct'])
  console.log(`${plates.length} plates · ${base} · stages ${stages.join(',')} · ${seconds}s each`)

  const rows: StageResult[] = []
  for (const users of stages) {
    const r = await runStage(base, plates, users, seconds)
    rows.push(r)
    console.log(r)
    if (r.throttled > 0) console.warn('429s seen: the throttle is in the way, results are not the server ceiling')
    if (r.p95 > maxP95 || r.errorPct > maxErr) {
      console.warn(`stopping: p95 ${r.p95} ms / errors ${r.errorPct}% over threshold at ${users} users`)
      break
    }
  }
  console.table(rows)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
