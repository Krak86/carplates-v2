import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const SCRIPTS_DIR = join(import.meta.dirname, '..')

/**
 * Rollups computed from `current_registration`, in no required order (each reads the registry, none reads another):
 * the /fuel, /safety and /stats "Markets" pages. They go stale on every registry ingest, so ingests rebuild them.
 * A new rollup of this kind belongs in this list.
 */
export const DERIVED_REFRESH_SCRIPTS = ['src/fuel-stats.ts', 'src/safety-stats.ts', 'src/vdb-stats.ts'] as const

/** Runs each derived-stats script in turn (own process each — they are CLIs); throws on the first failure. */
export function refreshDerived(): void {
  for (const script of DERIVED_REFRESH_SCRIPTS) {
    console.log(`refreshing derived stats: ${script} …`)
    const result = spawnSync('tsx', [script], { cwd: SCRIPTS_DIR, stdio: 'inherit', shell: true })
    if (result.status !== 0) throw new Error(`${script} failed (exit ${String(result.status)})`)
  }
}
