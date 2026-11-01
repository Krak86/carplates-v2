/** Pure helpers of `load-test.ts` (kept apart so tests can import them without running the CLI). */

export type StageResult = {
  users: number
  rps: number
  p50: number
  p95: number
  p99: number
  errorPct: number
  throttled: number
}

type FetchFn = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Response>

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]']

export function percentile(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0
}

export function parsePlates(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

/** Strips a trailing slash; throws for a non-local host unless `allowRemote`. */
export function resolveTarget(baseUrl: string, allowRemote: boolean): string {
  const base = baseUrl.replace(/\/$/, '')
  const host = new URL(base).hostname
  if (!LOCAL_HOSTS.includes(host) && !allowRemote) {
    throw new Error(`refusing non-local target ${host} without --allow-remote`)
  }
  return base
}

export function exceedsThreshold(r: StageResult, maxP95Ms: number, maxErrorPct: number): boolean {
  return r.p95 > maxP95Ms || r.errorPct > maxErrorPct
}

/** Closed loop: `users` workers request random plates back to back until `seconds` elapse. */
export async function runStage(
  base: string,
  plates: string[],
  users: number,
  seconds: number,
  fetchFn: FetchFn = fetch
): Promise<StageResult> {
  const latencies: number[] = []
  let errors = 0
  let networkFailures = 0 // no response, so no latency sample (5xx responses have one)
  let throttled = 0
  const deadline = Date.now() + seconds * 1000

  async function worker(): Promise<void> {
    while (Date.now() < deadline) {
      const plate = plates[Math.floor(Math.random() * plates.length)]!
      const started = performance.now()
      try {
        const res = await fetchFn(`${base}/api/plate/${encodeURIComponent(plate)}`, {
          headers: { 'user-agent': 'carsua-load-test' },
          signal: AbortSignal.timeout(10_000)
        })
        await res.arrayBuffer()
        if (res.status === 429) {
          throttled++ // instant reply from the throttle: not a latency or throughput sample
          continue
        }
        if (res.status >= 500) errors++
        latencies.push(performance.now() - started)
      } catch {
        errors++
        networkFailures++
      }
    }
  }

  await Promise.all(Array.from({ length: users }, worker))
  const sorted = latencies.sort((a, b) => a - b)
  const total = sorted.length + networkFailures
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
