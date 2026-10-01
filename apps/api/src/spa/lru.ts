/** Minimal size-capped LRU (Map keeps insertion order; a hit re-inserts to mark it fresh). */
export class Lru<V> {
  private readonly map = new Map<string, V>()

  constructor(private readonly max: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key)
    if (hit === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, hit)
    return hit
  }

  set(key: string, value: V): void {
    this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
  }
}
