import { makeKey, modelKey } from '@carplates/shared'
import type { RdwRecallInsert, RdwRecallModelInsert } from '@carplates/db'

type Rec = Record<string, unknown>

const text = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

/** RDW's compact dates ("20071106") → ISO; anything else (empty, "0", impossible days) → null. */
export function parseRdwDate(v: unknown): string | null {
  const s = text(v)
  const m = s && /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso
}

const count = (v: unknown): number | null => {
  const s = text(v)
  const n = s == null ? NaN : Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

/** RDW writes "(Nog) niet bekend" where it has no link. */
const link = (v: unknown): string | null => {
  const s = text(v)
  return s && /^https?:\/\//i.test(s) ? s : null
}

export function parseCampaign(rec: Rec, hazards: readonly string[]): RdwRecallInsert | null {
  const code = text(rec.referentiecode_rdw)
  if (!code) return null
  return {
    referenceCode: code,
    publishedAt: parseRdwDate(rec.publicatiedatum_rdw),
    announcedAt: parseRdwDate(rec.datum_aankondiging_producent),
    producer: text(rec.meldende_producent_distributeur),
    defect: text(rec.omschrijving_defect),
    category: text(rec.categorie_defect),
    consequences: text(rec.materi_le_gevolgen),
    remedy: text(rec.beschrijving_van_het_herstel),
    moreInfoUrl: link(rec.meer_informatie_op_internet),
    riskCode: text(rec.risicobeoordeling_rdw),
    hazards: [...hazards],
    vehiclesTotal: count(rec.totaal_aantal_voertuigen_terugroepactie),
    vehiclesNational: count(rec.nationaal_opgegeven_aantal_voertuigen_terugroepactie)
  }
}

/** One campaign ↔ make/type row; null when a field is missing or the keys come out empty (nothing to match on). */
export function parseCampaignModel(rec: Rec): RdwRecallModelInsert | null {
  const code = text(rec.referentiecode_rdw)
  const make = text(rec.merk)
  const model = text(rec.type)
  if (!code || !make || !model) return null
  const mk = makeKey(make)
  const mdk = modelKey(model)
  return mk && mdk ? { referenceCode: code, make, model, makeKey: mk, modelKey: mdk } : null
}

/** Hazard rows → reference code → distinct hazard texts. */
export function groupHazards(rows: readonly Rec[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const r of rows) {
    const code = text(r.referentiecode_rdw)
    const hazard = text(r.mogelijk_gevaar)
    if (!code || !hazard) continue
    const list = out.get(code) ?? []
    if (!list.includes(hazard)) list.push(hazard)
    out.set(code, list)
  }
  return out
}

/** Two RDW spellings can share a key; the table's primary key allows one row per (campaign, make, model). */
export function dedupeModels(rows: readonly RdwRecallModelInsert[]): RdwRecallModelInsert[] {
  const seen = new Map<string, RdwRecallModelInsert>()
  for (const r of rows) seen.set(`${r.referenceCode}|${r.makeKey}|${r.modelKey}`, r)
  return [...seen.values()]
}
