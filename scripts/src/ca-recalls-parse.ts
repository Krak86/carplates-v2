import { makeKey, modelKey } from '@carplates/shared'
import type { CaRecallInsert, CaRecallModelInsert } from '@carplates/db'

/** Recalls older than this are not compared: NHTSA's flat file `FLAT_RCL_POST_2010` starts there. */
export const CA_FROM_DATE = '2010-01-01'

/** Twin test windows: same make + same model within this many days, or the same manufacturer campaign number within the longer one. */
const MODEL_WINDOW_DAYS = 120
const MFR_NO_WINDOW_DAYS = 400

/**
 * Transport Canada notification types that are real safety campaigns. The rest are not recalls: `Compliance *` (labels, CMVSS
 * paperwork - "This is not a recall"), `Inconsequential`, `Superseded`, `Recalls Audit`.
 */
export const CA_SAFETY_NOTIFICATIONS = ['Safety Mfr', 'Safety TC', 'Service Campaign Mfr'] as const

type Rec = Record<string, string | undefined>

/** One Transport Canada campaign, folded from its make / model / model-year rows. */
export type CaCampaign = {
  recallNumber: string
  recalledAt: string
  notification: string
  category: string | null
  system: string | null
  mfrRecallNo: string | null
  comment: string | null
  units: number | null
  /** Distinct (make, model, year) rows as TC spells them. */
  models: Map<string, { make: string; model: string; year: number }>
}

/** One NHTSA campaign (flat file), folded from its make / model / year rows. */
export type UsCampaign = { id: string; make: string; mfrNo: string; date: string; models: Set<string> }

const clean = (v: string | undefined): string | null => {
  const s = (v ?? '').trim()
  return s === '' ? null : s
}

/** Upper-case letters and digits only: the loose comparison key for the twin test (same as the overlap research). */
export const alnum = (v: string | null | undefined): string => (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** "Issue: \nOn certain…\n\n\nSafety Risk:" → single blank lines, no trailing spaces. */
export function cleanComment(v: string | undefined): string | null {
  const s = (v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return s === '' ? null : s
}

/** Folds one row of `vrdb_full_monthly.csv` into `acc`; rows before `CA_FROM_DATE` or of a non-safety type are skipped. */
export function addTcRow(acc: Map<string, CaCampaign>, r: Rec): void {
  const date = clean(r.RECALL_DATE_DTE)
  const number = clean(r.RECALL_NUMBER_NUM)
  const notification = clean(r.NOTIFICATION_TYPE_ETXT)
  if (!date || !number || date < CA_FROM_DATE) return
  if (!notification || !(CA_SAFETY_NOTIFICATIONS as readonly string[]).includes(notification)) return

  const make = clean(r.MAKE_NAME_NM)
  const model = clean(r.MODEL_NAME_NM)
  let c = acc.get(number)
  if (!c) {
    const units = Number(r.UNIT_AFFECTED_NBR)
    c = {
      recallNumber: number,
      recalledAt: date,
      notification,
      category: clean(r.CATEGORY_ETXT),
      system: clean(r.SYSTEM_TYPE_ETXT),
      mfrRecallNo: clean(r.MANUFACTURER_RECALL_NO_TXT),
      comment: cleanComment(r.COMMENT_ETXT),
      units: Number.isFinite(units) && units > 0 ? Math.round(units) : null,
      models: new Map()
    }
    acc.set(number, c)
  }
  if (make && model) {
    const year = Math.round(Number(r.YEAR))
    const y = Number.isFinite(year) && year >= 1900 && year <= 2100 ? year : 0
    c.models.set(`${make}|${model}|${y}`, { make, model, year: y })
  }
}

/** One NHTSA flat-file line (tab-separated: 1 CAMPNO, 2 MAKETXT, 3 MODELTXT, 4 YEARTXT, 5 MFGCAMPNO, 15 RCDATE) → fold into `acc`. */
export function addUsLine(acc: Map<string, UsCampaign>, line: string): void {
  const c = line.split('\t')
  if (c.length < 16) return
  const id = c[1]!
  let e = acc.get(id)
  if (!e) {
    const d = c[15]!
    e = {
      id,
      make: alnum(c[2]),
      mfrNo: alnum(c[5]),
      date: /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : '',
      models: new Set()
    }
    acc.set(id, e)
  }
  e.models.add(alnum(c[3]))
}

const dayGap = (a: string, b: string): number => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5

/** `rm` matches an NHTSA model spelling: equal, or one starts with the other (both >= 3 chars) - "GOLF" ~ "GOLFSPORTWAGEN". */
function modelHit(usModels: ReadonlySet<string>, rm: string): boolean {
  for (const m of usModels) {
    if (m === rm || (rm.length >= 3 && m.startsWith(rm)) || (m.length >= 3 && rm.startsWith(m))) return true
  }
  return false
}

export function groupUsByMake(us: Iterable<UsCampaign>): Map<string, UsCampaign[]> {
  const out = new Map<string, UsCampaign[]>()
  for (const e of us) {
    const list = out.get(e.make) ?? []
    list.push(e)
    out.set(e.make, list)
  }
  return out
}

/**
 * Is there an NHTSA campaign that is probably the same global recall? Same make, and either the same manufacturer campaign number
 * (within 400 days) or a shared model spelling within 120 days. Heuristic - NHTSA and TC share no id - tuned in the 2026-10-10
 * overlap research (`DATASETS_PLAN.md` "Stage H"): ~75 % of all Canadian recalls since 2010 have a twin.
 */
export function hasUsTwin(ca: CaCampaign, usByMake: ReadonlyMap<string, readonly UsCampaign[]>): boolean {
  const mfrNo = alnum(ca.mfrRecallNo)
  const makes = new Set([...ca.models.values()].map(m => alnum(m.make)))
  const models = [...new Set([...ca.models.values()].map(m => alnum(m.model)))].filter(Boolean)
  for (const make of makes) {
    for (const us of usByMake.get(make) ?? []) {
      if (!us.date) continue
      const gap = dayGap(ca.recalledAt, us.date)
      if (mfrNo && us.mfrNo === mfrNo && gap <= MFR_NO_WINDOW_DAYS) return true
      if (gap <= MODEL_WINDOW_DAYS && models.some(m => modelHit(us.models, m))) return true
    }
  }
  return false
}

export type CaSnapshot = { recalls: CaRecallInsert[]; models: CaRecallModelInsert[] }

/** The campaigns without a US twin as insert rows: one row per campaign plus one per (make, model, year) with our keys. */
export function toSnapshot(campaigns: Iterable<CaCampaign>): CaSnapshot {
  const recalls: CaRecallInsert[] = []
  const models: CaRecallModelInsert[] = []
  for (const c of campaigns) {
    const links = new Map<string, CaRecallModelInsert>()
    for (const m of c.models.values()) {
      const mk = makeKey(m.make)
      const mdk = modelKey(m.model)
      if (!mk || !mdk) continue
      links.set(`${mk}|${mdk}|${m.year}`, {
        recallNumber: c.recallNumber,
        make: m.make,
        model: m.model,
        makeKey: mk,
        modelKey: mdk,
        modelYear: m.year
      })
    }
    if (links.size === 0) continue // nothing to match a registry car on
    recalls.push({
      recallNumber: c.recallNumber,
      recalledAt: c.recalledAt,
      notification: c.notification,
      category: c.category,
      system: c.system,
      mfrRecallNo: c.mfrRecallNo,
      comment: c.comment,
      units: c.units
    })
    models.push(...links.values())
  }
  return { recalls, models }
}
