import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const FAILURE_STAGES = ['search', 'imageinfo', 'lead', 'attribution'] as const
export type FailureStage = (typeof FAILURE_STAGES)[number]

export type FailureEntry = {
  stage: FailureStage
  brand: string
  model: string
  /** Stage-2 batches: the file titles that were being fetched for this model (retried as titles, not re-searched). */
  titles?: string[]
  /** null = network error / timeout. */
  httpStatus: number | null
  error: string
  attempts: number
  at: string
}

const modelId = (brand: string, model: string): string => `${brand}\u0000${model}`

/**
 * Every Wikimedia request that ended in an error, written to a plain JSON file as it happens (a killed run keeps the
 * list). `--retry-failed` replays exactly these models; a model that later succeeds is cleared.
 */
export class FailureLog {
  private entries: FailureEntry[]

  constructor(private readonly path: string) {
    this.entries = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as FailureEntry[]) : []
  }

  get all(): readonly FailureEntry[] {
    return this.entries
  }

  add(entry: Omit<FailureEntry, 'at'>, now: Date = new Date()): void {
    this.entries.push({ ...entry, at: now.toISOString() })
    this.save()
  }

  /** Drop every entry of a model that has now been processed successfully. */
  clearModel(brand: string, model: string): void {
    const id = modelId(brand, model)
    const kept = this.entries.filter(e => modelId(e.brand, e.model) !== id)
    if (kept.length === this.entries.length) return
    this.entries = kept
    this.save()
  }

  models(): Array<{ brand: string; model: string }> {
    const seen = new Map(this.entries.map(e => [modelId(e.brand, e.model), { brand: e.brand, model: e.model }]))
    return [...seen.values()]
  }

  /** `"429 × 12 (search 9, imageinfo 3), timeout × 2 (lead 2)"`, or `null` when empty. */
  summary(): string | null {
    if (!this.entries.length) return null
    const groups = new Map<string, Map<FailureStage, number>>()
    for (const e of this.entries) {
      const status = e.httpStatus === null ? 'timeout/network' : String(e.httpStatus)
      const byStage = groups.get(status) ?? new Map<FailureStage, number>()
      byStage.set(e.stage, (byStage.get(e.stage) ?? 0) + 1)
      groups.set(status, byStage)
    }
    return [...groups]
      .map(([status, byStage]) => {
        const total = [...byStage.values()].reduce((a, b) => a + b, 0)
        return `${status} × ${total} (${[...byStage].map(([stage, n]) => `${stage} ${n}`).join(', ')})`
      })
      .join(', ')
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(this.entries, null, 2))
  }
}
