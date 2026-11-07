/**
 * PROBE (step 1 of "Brand pronunciation") — how many catalog makes have IPA / respelling / audio in the Wikipedia lead?
 *   pnpm exec tsx scripts/src/brand-pronounce-probe.ts [--refresh] [--list] [slug ...]
 * Makes come from `registry.catalog_make` (read only). Article titles come from Wikidata sitelinks (QIDs in
 * seed-data/brand-origin.csv.gz), falling back to an en.wikipedia search. Lead wikitext is fetched with
 * `action=parse&prop=wikitext&section=0` and cached in scripts/.data/brand-pronounce/ (gitignored). No DB writes.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

import { catalogMake, createDb } from '@carplates/db'

import { createFetcher, WIKIS, type Titles } from './brand-pronounce-fetch.js'

const LANGS = WIKIS
type Lang = (typeof LANGS)[number]

const args = process.argv.slice(2)
const list = args.includes('--list')
const only = args.filter(a => !a.startsWith('--'))
const { sitelinks, searchEn, lead: leadPage } = createFetcher(args.includes('--refresh'))
const lead = async (lang: Lang, title: string): Promise<string> => (await leadPage(lang, title)).wikitext

/** brand_slug -> Wikidata QID, from the origin seed CSV's `source` column. */
function seedQids(): Map<string, string> {
  const csv = gunzipSync(readFileSync(join(import.meta.dirname, '..', 'seed-data', 'brand-origin.csv.gz'))).toString()
  const out = new Map<string, string>()
  for (const line of csv.split('\n').slice(1)) {
    const cols = line.split(',')
    const q = /Q\d+/.exec(cols[cols.length - 1] ?? '')?.[0]
    if (cols[0] && q && !out.has(cols[0])) out.set(cols[0], q)
  }
  return out
}

// ---- classification (probe-grade; the real parser is step 2) ----
const AUDIO_RE = /([^|{}=\n]+?\.(?:ogg|oga|mp3|wav|flac))/i

type Hit = Record<string, boolean>
function classify(lang: Lang, wt: string): { forms: Hit; audio: string | null } {
  const forms: Hit = {}
  const ipaTpl = /\{\{\s*IPA(?:-[a-z]+)?\s*\|([^{}]*)\}\}/gi
  const ipaTemplates = [...wt.matchAll(ipaTpl)].map(m => m[1] ?? '')
  forms['IPA template'] = ipaTemplates.length > 0
  forms['IPAc-en'] = /\{\{\s*IPAc-en\b/i.test(wt)
  forms['IPA in efn'] = /\{\{\s*efn\b[\s\S]*?\{\{\s*IPA/i.test(wt)
  forms['IPA with lang code'] = ipaTemplates.some(t => /^[a-z]{2,3}\|/i.test(t))
  forms['{{audio}}/{{listen}}'] = /\{\{\s*(?:audio|listen|Audio-IPA)\b/i.test(wt)
  forms['[ipa-like chars]'] = /[ˈˌːʒʃɛɔəɑʊɪæɡ]/.test(wt)
  if (lang === 'uk') {
    forms['{{lang-uk}} / вимова'] = /\{\{\s*(?:lang-uk|мова-uk)\b/i.test(wt) || /вимов/i.test(wt)
    forms['МФА'] = /МФА/.test(wt)
  }
  if (lang === 'ru') {
    forms['МФА'] = /МФА/.test(wt)
    forms['произношение близко к'] = /произношени[ея]|произносится|читается/i.test(wt)
    forms['«respelling»'] = /(?:произношени[ея][^\n]{0,40}|произносится[^\n]{0,20})«[^»]+»/i.test(wt)
  }
  const audioHint = [...wt.matchAll(/\{\{\s*(?:IPA|audio|listen)[^{}]*\}\}/gi)].map(m => m[0]).join(' ')
  const audio = AUDIO_RE.exec(audioHint)?.[1]?.trim() ?? null
  return { forms, audio }
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  let makes: { makeSlug: string; makeName: string; n: number }[]
  try {
    makes = await db.select().from(catalogMake)
  } finally {
    await close()
  }
  makes.sort((a, b) => b.n - a.n)
  if (only.length) makes = makes.filter(m => only.includes(m.makeSlug))
  console.log(`catalog makes: ${makes.length}`)

  const qids = seedQids()
  const wanted = [...new Set(makes.flatMap(m => qids.get(m.makeSlug) ?? []))]
  const links = await sitelinks(wanted)

  const stats = new Map<Lang, { fetched: number; withAny: number; forms: Map<string, number> }>()
  for (const l of LANGS) stats.set(l, { fetched: 0, withAny: 0, forms: new Map() })
  const audioFiles = new Map<string, string>()
  let noQid = 0
  const rows: string[] = []

  for (const m of makes) {
    const qid = qids.get(m.makeSlug)
    const t: Titles = { ...(qid ? links.get(qid) : undefined) }
    if (!qid) noQid++
    if (!t.en) t.en = (await searchEn(m.makeName)) ?? undefined
    const cells: string[] = []
    for (const lang of LANGS) {
      const title = t[lang]
      const s = stats.get(lang)!
      if (!title) {
        cells.push(`${lang}:-`)
        continue
      }
      const wt = await lead(lang, title)
      if (!wt) {
        cells.push(`${lang}:?`)
        continue
      }
      s.fetched++
      const { forms, audio } = classify(lang, wt)
      const real = lang === 'uk' ? ['IPA template', '{{lang-uk}} / вимова', 'МФА'] : ['IPA template', 'МФА', 'IPAc-en']
      const any = real.some(k => forms[k])
      if (any) s.withAny++
      for (const [k, v] of Object.entries(forms)) if (v) s.forms.set(k, (s.forms.get(k) ?? 0) + 1)
      if (audio && lang === 'en') audioFiles.set(m.makeSlug, audio)
      cells.push(`${lang}:${any ? 'Y' : 'n'}${audio ? '♪' : ''}`)
    }
    rows.push(`${m.makeSlug.padEnd(22)} ${cells.join('  ')}`)
  }

  if (list) console.log(rows.join('\n'))
  console.log(`\nmakes without QID in brand-origin seed: ${noQid} (en title via search)`)
  for (const l of LANGS) {
    const s = stats.get(l)!
    console.log(
      `\n[${l}] leads fetched ${s.fetched}/${makes.length}, with transcription-like form ${s.withAny} (${pct(s.withAny, makes.length)})`
    )
    for (const [k, n] of [...s.forms].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k.padEnd(26)} ${String(n).padStart(4)}  ${pct(n, makes.length)}`)
    }
  }
  console.log(
    `\nCommons/audio file name in en lead: ${audioFiles.size}/${makes.length} (${pct(audioFiles.size, makes.length)})`
  )
  for (const [slug, f] of audioFiles) console.log(`    ${slug.padEnd(22)} ${f}`)
}

function pct(n: number, total: number): string {
  return total ? `${((100 * n) / total).toFixed(0)}%` : '-'
}

await main()
