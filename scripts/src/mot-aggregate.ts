import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  MILES_TO_KM,
  MOT_GROUP_CODES,
  MOT_MAX_BANDS,
  MOT_MIN_KEY_TESTS,
  type MotKind,
  makeKey,
  modelKey,
  motBandOf
} from '@carplates/shared'

import { type MotReasonIndex } from './mot-lookup.js'
import { columnIndex, forEachCsvLine, openZipCsv } from './mot-zip.js'

/** DVSA test class → kind. Class 3/5 (three-wheelers, buses) and anything else is dropped. */
const KIND_BY_CLASS: Readonly<Record<string, MotKind>> = {
  '4': 'car',
  '7': 'van',
  '1': 'motorcycle',
  '2': 'motorcycle'
}
const KIND_INDEX: Readonly<Record<MotKind, number>> = { car: 0, van: 1, motorcycle: 2 }
const KINDS: readonly MotKind[] = ['car', 'van', 'motorcycle']

/** Completed normal tests: pass, pass after rectification at the station, fail. Aborted / abandoned ones are no outcome. */
const COMPLETED = new Set(['P', 'PRS', 'F'])

/** Model years before this share one bucket; the array spans this year + 63. */
export const MOT_FIRST_MODEL_YEAR = 1990
const YEAR_SLOTS = 40
const G = MOT_GROUP_CODES.length
/** Distinct specific reasons the counters have room for (2022 appear in 2021-23; assigned densely on first sight). */
const REASON_CAP = 2600
const MAX_TRACKED = 0x1fff
const UNTRACKED = 0x1fff

/** Implausible odometer (km mixed into miles before 2022, typos): above this many miles per year of age. */
const MAX_MILES_PER_YEAR = 40_000

export type MotFiles = {
  year: number
  result: string
  item: string
  /** The item file is split over several parts (2021): a test's rows are scattered, so "once per test" needs exact bookkeeping. */
  scattered?: boolean
}

export type KeyInfo = { kind: MotKind; makeKey: string; modelKey: string; make: string; model: string; tests: number }

/** Identifier of a make/model in a census / tracked map. */
export const keyId = (kind: MotKind, mk: string, mo: string): string => `${kind}|${mk}|${mo}`

/** Memoised (make, model) text → keys: 35M rows share ~70k distinct spellings, so the regexes run once per spelling. */
class KeyCache {
  private readonly cache = new Map<string, { mk: string; mo: string } | null>()
  get(make: string, model: string): { mk: string; mo: string } | null {
    const raw = `${make}\u0001${model}`
    let hit = this.cache.get(raw)
    if (hit === undefined) {
      const mk = makeKey(make)
      const mo = modelKey(model)
      hit = mk && mo ? { mk, mo } : null
      this.cache.set(raw, hit)
    }
    return hit
  }
}

type Cols = {
  testId: number
  cls: number
  type: number
  result: number
  mileage: number
  make: number
  model: number
  firstUse: number
}

const resultCols = (h: string[]): Cols => {
  const ix = columnIndex(h, [
    'test_id',
    'test_class_id',
    'test_type',
    'test_result',
    'test_mileage',
    'make',
    'model',
    'first_use_date'
  ])
  return {
    testId: ix.test_id!,
    cls: ix.test_class_id!,
    type: ix.test_type!,
    result: ix.test_result!,
    mileage: ix.test_mileage!,
    make: ix.make!,
    model: ix.model!,
    firstUse: ix.first_use_date!
  }
}

/** Census: normal-test counts per kind + make/model key (and the most common raw spelling) for one year file. */
export type Census = Record<string, { make: string; model: string; tests: number; spellings: Record<string, number> }>

export async function censusYear(file: MotFiles): Promise<Census> {
  const keys = new KeyCache()
  const out: Census = {}
  let c!: Cols
  await forEachCsvLine(
    openZipCsv(file.result, 'test_result'),
    h => {
      c = resultCols(h)
    },
    r => {
      const kind = KIND_BY_CLASS[r[c.cls]!]
      if (!kind || r[c.type] !== 'NT' || !COMPLETED.has(r[c.result]!)) return
      const k = keys.get(r[c.make]!.trim().toUpperCase(), r[c.model]!.trim().toUpperCase())
      if (!k) return
      const id = keyId(kind, k.mk, k.mo)
      const rec = (out[id] ??= { make: '', model: '', tests: 0, spellings: {} })
      rec.tests++
      const spelling = `${r[c.make]!.trim().toUpperCase()}|${r[c.model]!.trim().toUpperCase()}`
      rec.spellings[spelling] = (rec.spellings[spelling] ?? 0) + 1
    }
  )
  for (const rec of Object.values(out)) {
    const [top] = Object.entries(rec.spellings).sort((a, b) => b[1] - a[1])
    const [make, model] = (top?.[0] ?? '|').split('|')
    rec.make = make ?? ''
    rec.model = model ?? ''
    // Keep only the few biggest spellings: the cache file stays small.
    rec.spellings = Object.fromEntries(
      Object.entries(rec.spellings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    )
  }
  return out
}

/** Census of a year, cached in `cacheDir` (the pass over the result file takes minutes). */
export async function cachedCensus(file: MotFiles, cacheDir: string, refresh: boolean): Promise<Census> {
  const path = join(cacheDir, `census-${file.year}.json`)
  if (!refresh) {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as Census
    } catch {
      // not cached yet
    }
  }
  const census = await censusYear(file)
  await mkdir(cacheDir, { recursive: true })
  await writeFile(path, JSON.stringify(census))
  return census
}

/** Exact set of (test id, code) pairs — open addressing over two typed arrays, no false positives. */
class PairSet {
  private readonly a: Uint32Array
  private readonly b: Uint32Array
  private readonly mask: number
  constructor(bits: number) {
    this.a = new Uint32Array(1 << bits)
    this.b = new Uint32Array(1 << bits)
    this.mask = (1 << bits) - 1
  }
  /** True when the pair was new. `code` must be >= 1 (0 marks an empty slot). */
  add(test: number, code: number): boolean {
    let i = (Math.imul(test ^ Math.imul(code, 0x85ebca6b), 0x9e3779b1) >>> 0) & this.mask
    for (;;) {
      if (this.b[i] === 0) {
        this.a[i] = test
        this.b[i] = code
        return true
      }
      if (this.a[i] === test && this.b[i] === code) return false
      i = (i + 1) & this.mask
    }
  }
}

/** Open-addressing hash table `test_id` → 32-bit payload; ~33M entries a year in two typed arrays (~512 MB). */
class TestTable {
  private readonly keys: Uint32Array
  private readonly vals: Uint32Array
  private readonly mask: number
  size = 0
  /** Per-test "already counted for this group" bits (failed groups 0-13, advisory groups 14-27); only in exact mode. */
  masks: Uint32Array | null = null
  constructor(bits: number) {
    this.keys = new Uint32Array(1 << bits)
    this.vals = new Uint32Array(1 << bits)
    this.mask = (1 << bits) - 1
  }
  clear(): void {
    this.keys.fill(0)
    this.vals.fill(0)
    this.masks?.fill(0)
    this.size = 0
  }
  enableMasks(): Uint32Array {
    this.masks ??= new Uint32Array(this.keys.length)
    return this.masks
  }
  slot(id: number): number {
    const key = id === 0 ? 0xffffffff : id
    let i = (Math.imul(key, 0x9e3779b1) >>> 0) & this.mask
    for (;;) {
      const k = this.keys[i]!
      if (k === key) return i
      if (k === 0) return -1
      i = (i + 1) & this.mask
    }
  }
  insert(id: number, val: number): void {
    const key = id === 0 ? 0xffffffff : id
    let i = (Math.imul(key, 0x9e3779b1) >>> 0) & this.mask
    while (this.keys[i] !== 0 && this.keys[i] !== key) i = (i + 1) & this.mask
    if (this.keys[i] === 0) this.size++
    this.keys[i] = key
    this.vals[i] = val
  }
  get(i: number): number {
    return this.vals[i]!
  }
  set(i: number, val: number): void {
    this.vals[i] = val
  }
}

// payload layout: tracked (13) | year slot (6) | band (3) | kind (2) | flags
const P_YEAR = 13
const P_BAND = 19
const P_KIND = 22
const F_FAILED = 1 << 24
const F_VISITED = 1 << 25
const F_ADV = 1 << 26
const F_DANGEROUS = 1 << 27

/** What one test has already been counted for: group bit masks and the (short) lists of reasons. */
type TestSeen = { groupF: number; groupA: number; reasonF: number[]; reasonA: number[] }
const newSeen = (): TestSeen => ({ groupF: 0, groupA: 0, reasonF: [], reasonA: [] })

/** Tests remembered while reading the item file (rows of one test are at most a few runs apart, even in 2021). */
const RECENT_TESTS = 512

export type MotRows = {
  stats: {
    kind: MotKind
    makeKey: string
    modelKey: string
    modelYear: number
    band: number
    tests: number
    fails: number
    advisories: number
  }[]
  issues: {
    kind: MotKind
    makeKey: string
    modelKey: string
    band: number
    tests: number
    dangerous: number
    groups: Record<string, [number, number]>
    reasons: Record<string, [number, number]>
  }[]
  baseline: {
    kind: MotKind
    band: number
    tests: number
    fails: number
    advisories: number
    dangerous: number
    groups: Record<string, [number, number]>
  }[]
  keys: { kind: MotKind; makeKey: string; modelKey: string; make: string; model: string; tests: number }[]
  reasons: { code: string; group: string; item: string; failText: string; watchText: string }[]
  diagnostics: Record<string, number>
}

/** Pooled aggregation over several year files. Call `addYear` per file, then `finish`. */
export class MotAggregator {
  private readonly tracked: Map<string, number>
  private readonly trackedKeys: KeyInfo[]
  private readonly denseOf: Int32Array
  /** dense reason slot → index into `reasonIndex.reasons`. */
  private readonly dense: number[] = []
  private readonly table = new TestTable(26)
  private readonly keyCache = new KeyCache()
  /** [tracked][yearSlot][band][tests, fails, advisories] */
  private readonly cells: Int32Array
  /** [tracked][band][tests-with-dangerous-fail, G*2 groups, R*2 reasons] */
  private readonly issueSlot: number
  private readonly issues: Int32Array
  /** [kind][band][tests, fails, advisories, dangerous, G*2 groups] */
  private readonly baseline = new Int32Array(3 * MOT_MAX_BANDS * (4 + G * 2))
  readonly diag: Record<string, number> = {}
  private readonly reasonIndex: MotReasonIndex

  constructor(census: Census, reasonIndex: MotReasonIndex, minKeyTests = MOT_MIN_KEY_TESTS) {
    this.reasonIndex = reasonIndex
    this.denseOf = new Int32Array(reasonIndex.reasons.length).fill(-1)
    this.tracked = new Map()
    this.trackedKeys = []
    for (const [id, rec] of Object.entries(census).sort((a, b) => b[1].tests - a[1].tests)) {
      if (rec.tests < minKeyTests) continue
      const [kind, mk, mo] = id.split('|') as [MotKind, string, string]
      this.tracked.set(id, this.trackedKeys.length)
      this.trackedKeys.push({ kind, makeKey: mk, modelKey: mo, make: rec.make, model: rec.model, tests: rec.tests })
    }
    if (this.trackedKeys.length >= MAX_TRACKED)
      throw new Error(`${this.trackedKeys.length} tracked keys do not fit 13 bits`)
    const K = this.trackedKeys.length
    this.cells = new Int32Array(K * YEAR_SLOTS * MOT_MAX_BANDS * 3)
    this.issueSlot = 1 + G * 2 + REASON_CAP * 2
    this.issues = new Int32Array(K * MOT_MAX_BANDS * this.issueSlot)
  }

  get trackedCount(): number {
    return this.trackedKeys.length
  }

  get issueBytes(): number {
    return this.issues.byteLength
  }

  private bump(name: string, n = 1): void {
    this.diag[name] = (this.diag[name] ?? 0) + n
  }

  async addYear(file: MotFiles, log: (m: string) => void): Promise<void> {
    this.table.clear()
    const t0 = Date.now()
    await this.readResults(file)
    log(`  ${file.year}: ${this.table.size} tests indexed (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
    const t1 = Date.now()
    await this.readItems(file)
    log(`  ${file.year}: items joined (${((Date.now() - t1) / 1000).toFixed(0)} s)`)
  }

  private async readResults(file: MotFiles): Promise<void> {
    let c!: Cols
    await forEachCsvLine(
      openZipCsv(file.result, 'test_result'),
      h => {
        c = resultCols(h)
      },
      r => {
        const kind = KIND_BY_CLASS[r[c.cls]!]
        if (!kind || r[c.type] !== 'NT') return
        const res = r[c.result]!
        if (!COMPLETED.has(res)) return
        const miles = Number(r[c.mileage])
        if (!(miles > 0)) {
          this.bump('noMileage')
          return
        }
        const firstUse = Number(r[c.firstUse]!.slice(0, 4))
        const age = Math.max(0, file.year - (firstUse > 1900 ? firstUse : file.year))
        if (miles > MAX_MILES_PER_YEAR * Math.max(1, age)) {
          this.bump('implausibleMileage')
          return
        }
        const km = miles * MILES_TO_KM
        const band = motBandOf(kind, km)
        const failed = res === 'F'
        const ys = Math.min(
          YEAR_SLOTS - 1,
          Math.max(0, (firstUse > 1900 ? firstUse : file.year) - MOT_FIRST_MODEL_YEAR)
        )

        const k = this.keyCache.get(r[c.make]!.trim().toUpperCase(), r[c.model]!.trim().toUpperCase())
        const t = k ? (this.tracked.get(keyId(kind, k.mk, k.mo)) ?? UNTRACKED) : UNTRACKED
        const bi = (KIND_INDEX[kind] * MOT_MAX_BANDS + band) * (4 + G * 2)
        this.baseline[bi]!++
        if (failed) this.baseline[bi + 1]!++
        if (t !== UNTRACKED) {
          const ci = ((t * YEAR_SLOTS + ys) * MOT_MAX_BANDS + band) * 3
          this.cells[ci]!++
          if (failed) this.cells[ci + 1]!++
        }
        const id = Number(r[c.testId])
        if (id >= 0xffffffff) return
        this.table.insert(
          id,
          t | (ys << P_YEAR) | (band << P_BAND) | (KIND_INDEX[kind] << P_KIND) | (failed ? F_FAILED : 0)
        )
      }
    )
  }

  private async readItems(file: MotFiles): Promise<void> {
    const { reasonOf, groupOf, dangerousOf } = this.reasonIndex
    // The 2021 file interleaves a test's rows with its neighbours' (~7 % of tests reappear a few rows later), so "seen in
    // this test" is kept per test id over a sliding window of recent tests instead of per contiguous run.
    const exact = file.scattered === true
    const masks = exact ? this.table.enableMasks() : null
    const pairs = exact ? new PairSet(27) : null
    const recent = new Map<number, TestSeen>()
    let seen: TestSeen = newSeen()
    let lastTest = -1
    let slot = -1
    let payload = 0
    const S = this.issueSlot
    let ix: Record<string, number> = {}

    // Exact mode: the persistent per-test group bit decides, so a group is counted once however far apart the rows are.
    const isNewGroup = (at: number, bit: number): boolean => {
      const m = masks![at]!
      if (m & (1 << bit)) return false
      masks![at] = m | (1 << bit)
      return true
    }

    const flush = (): void => {
      if (slot >= 0) this.table.set(slot, payload)
    }

    await forEachCsvLine(
      openZipCsv(file.item, 'test_item'),
      h => {
        ix = columnIndex(h, ['test_id', 'rfr_id', 'rfr_type_code'])
      },
      r => {
        const type = r[ix.rfr_type_code!]!
        const isF = type === 'F'
        if (!isF && type !== 'A') return
        const id = Number(r[ix.test_id!])
        if (id !== lastTest) {
          flush()
          lastTest = id
          const known = recent.get(id)
          if (known) {
            seen = known
            this.bump('interleavedTests')
          } else {
            seen = newSeen()
            recent.set(id, seen)
            if (recent.size > RECENT_TESTS) recent.delete(recent.keys().next().value!)
          }
          slot = this.table.slot(id)
          if (slot < 0) this.bump('itemTestMissing')
          else {
            payload = this.table.get(slot)
            if (payload & F_VISITED && !known) this.bump('revisitedBeyondWindow')
            payload |= F_VISITED
          }
        }
        if (slot < 0) return
        const rfr = Number(r[ix.rfr_id!])
        const reasonIdx = reasonOf[rfr] ?? -1
        const group = groupOf[rfr] ?? -1
        if (reasonIdx < 0 || group < 0) {
          this.bump('unknownRfr')
          return
        }
        let reason = this.denseOf[reasonIdx]!
        if (reason < 0) {
          reason = this.dense.length
          if (reason >= REASON_CAP) throw new Error('more distinct reasons than REASON_CAP')
          this.denseOf[reasonIdx] = reason
          this.dense.push(reasonIdx)
        }
        const t = payload & 0x1fff
        const band = (payload >>> P_BAND) & 7
        const kindIdx = (payload >>> P_KIND) & 3
        const ys = (payload >>> P_YEAR) & 63
        const bi = (kindIdx * MOT_MAX_BANDS + band) * (4 + G * 2)
        const base = t === UNTRACKED ? -1 : (t * MOT_MAX_BANDS + band) * S

        if (isF) {
          if (dangerousOf[rfr] && !(payload & F_DANGEROUS)) {
            payload |= F_DANGEROUS
            this.baseline[bi + 3]!++
            if (base >= 0) this.issues[base]!++
          }
          if (exact ? isNewGroup(slot, group) : !(seen.groupF & (1 << group))) {
            seen.groupF |= 1 << group
            this.baseline[bi + 4 + group * 2]!++
            if (base >= 0) this.issues[base + 1 + group * 2]!++
          }
          if (base >= 0 && (exact ? pairs!.add(id, reason * 2 + 2) : !seen.reasonF.includes(reason))) {
            seen.reasonF.push(reason)
            this.issues[base + 1 + G * 2 + reason * 2]!++
          }
        } else {
          if (!(payload & F_ADV)) {
            payload |= F_ADV
            this.baseline[bi + 2]!++
            if (t !== UNTRACKED) this.cells[((t * YEAR_SLOTS + ys) * MOT_MAX_BANDS + band) * 3 + 2]!++
          }
          if (exact ? isNewGroup(slot, 14 + group) : !(seen.groupA & (1 << group))) {
            seen.groupA |= 1 << group
            this.baseline[bi + 4 + group * 2 + 1]!++
            if (base >= 0) this.issues[base + 1 + group * 2 + 1]!++
          }
          if (base >= 0 && (exact ? pairs!.add(id, reason * 2 + 1) : !seen.reasonA.includes(reason))) {
            seen.reasonA.push(reason)
            this.issues[base + 1 + G * 2 + reason * 2 + 1]!++
          }
        }
      }
    )
    flush()
  }

  /** Rows ready for the tables. `topReasons` = specific reasons kept per make/model. */
  finish(topReasons = 10): MotRows {
    const rows: MotRows = { stats: [], issues: [], baseline: [], keys: [], reasons: [], diagnostics: this.diag }
    const usedReasons = new Set<number>()
    const S = this.issueSlot
    const R0 = 1 + G * 2

    this.trackedKeys.forEach((key, t) => {
      const bandTests = new Array<number>(MOT_MAX_BANDS).fill(0)
      for (let ys = 0; ys < YEAR_SLOTS; ys++) {
        for (let band = 0; band < MOT_MAX_BANDS; band++) {
          const ci = ((t * YEAR_SLOTS + ys) * MOT_MAX_BANDS + band) * 3
          const tests = this.cells[ci]!
          if (tests === 0) continue
          bandTests[band]! += tests
          rows.stats.push({
            kind: key.kind,
            makeKey: key.makeKey,
            modelKey: key.modelKey,
            modelYear: MOT_FIRST_MODEL_YEAR + ys,
            band,
            tests,
            fails: this.cells[ci + 1]!,
            advisories: this.cells[ci + 2]!
          })
        }
      }
      rows.keys.push({ ...key, tests: bandTests.reduce((a, b) => a + b, 0) })

      // top reasons of this model over all bands (so every band's line is comparable)
      const totals = new Map<number, number>()
      for (let band = 0; band < MOT_MAX_BANDS; band++) {
        const base = (t * MOT_MAX_BANDS + band) * S
        for (let r = 0; r < this.dense.length; r++) {
          const n = this.issues[base + R0 + r * 2]! + this.issues[base + R0 + r * 2 + 1]!
          if (n) totals.set(r, (totals.get(r) ?? 0) + n)
        }
      }
      const top = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topReasons)
        .map(([r]) => r)
      top.forEach(r => usedReasons.add(r))

      for (let band = 0; band < MOT_MAX_BANDS; band++) {
        if (bandTests[band] === 0) continue
        const base = (t * MOT_MAX_BANDS + band) * S
        const groups: Record<string, [number, number]> = {}
        MOT_GROUP_CODES.forEach((code, g) => {
          const f = this.issues[base + 1 + g * 2]!
          const a = this.issues[base + 1 + g * 2 + 1]!
          if (f || a) groups[code] = [f, a]
        })
        const reasons: Record<string, [number, number]> = {}
        for (const r of top) {
          const f = this.issues[base + R0 + r * 2]!
          const a = this.issues[base + R0 + r * 2 + 1]!
          if (f || a) reasons[this.reasonIndex.reasons[this.dense[r]!]!.code] = [f, a]
        }
        rows.issues.push({
          kind: key.kind,
          makeKey: key.makeKey,
          modelKey: key.modelKey,
          band,
          tests: bandTests[band]!,
          dangerous: this.issues[base]!,
          groups,
          reasons
        })
      }
    })

    KINDS.forEach(kind => {
      for (let band = 0; band < MOT_MAX_BANDS; band++) {
        const bi = (KIND_INDEX[kind] * MOT_MAX_BANDS + band) * (4 + G * 2)
        if (this.baseline[bi] === 0) continue
        const groups: Record<string, [number, number]> = {}
        MOT_GROUP_CODES.forEach((code, g) => {
          const f = this.baseline[bi + 4 + g * 2]!
          const a = this.baseline[bi + 4 + g * 2 + 1]!
          if (f || a) groups[code] = [f, a]
        })
        rows.baseline.push({
          kind,
          band,
          tests: this.baseline[bi]!,
          fails: this.baseline[bi + 1]!,
          advisories: this.baseline[bi + 2]!,
          dangerous: this.baseline[bi + 3]!,
          groups
        })
      }
    })

    rows.reasons = [...usedReasons].map(r => {
      const d = this.reasonIndex.reasons[this.dense[r]!]!
      return { code: d.code, group: d.group, item: d.item, failText: d.failText, watchText: d.watchText }
    })
    return rows
  }
}
