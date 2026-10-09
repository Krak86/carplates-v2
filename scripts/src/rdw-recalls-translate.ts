/**
 * Machine-translates the free-text fields of RDW recall campaigns (defect, consequences, remedy; Dutch) into
 * `registry.rdw_recall_texts` with a LOCAL model — no API key: NLLB-200-distilled-600M through @huggingface/transformers
 * (ONNX, GPU via DirectML fp16 on Windows). The model downloads on first run into `scripts/.cache/models` (git-ignored).
 *
 * UK / RU are pivoted through English (Dutch -> en -> uk|ru): measured far better on technical words than direct Dutch.
 * Texts are split into sentences, each distinct sentence is translated once, results are saved every CHUNK texts, and the
 * run is resumable (only texts without a row for the (lang, engine) are translated), so it can be run in slices:
 *
 *   pnpm ingest:rdw-recalls:translate -- --max-minutes 60                    # an hour of the full backlog, then stop cleanly
 *   pnpm ingest:rdw-recalls:translate -- --make toyota --model camry         # one model's campaigns (keys as in the registry)
 *   pnpm ingest:rdw-recalls:translate -- --limit 50 --dump ./pilot.md        # translate 50 texts to a file, no DB writes
 *   pnpm ingest:rdw-recalls:translate -- --limit 1000                       # slices: the next 1000 texts still missing
 *   flags: --offset N (skip N of the missing texts) · --langs en,uk,ru · --engine nllb-600m-pivot · --device dml|cpu (cpu = q8) · --direct (no English pivot) · --gloss
 *
 * A segment whose output looks degenerate (empty, runaway length, repeated phrases) is retried once with a harsher repetition
 * penalty; if it still fails, the whole text gets NO row for that language and keeps showing the Dutch original.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDb, rdwRecallModels, rdwRecalls, rdwRecallTexts, recallTextHash } from '@carplates/db'
import { env, pipeline } from '@huggingface/transformers'
import { and, eq } from 'drizzle-orm'

import { applyGlossary } from './rdw-recalls-glossary.js'

const MODEL = 'Xenova/nllb-200-distilled-600M'
const NLLB: Record<string, string> = { en: 'eng_Latn', uk: 'ukr_Cyrl', ru: 'rus_Cyrl' }
const CHUNK = 100 // texts per save point

type Args = {
  langs: string[]
  make?: string
  model?: string
  limit?: number
  offset?: number
  dump?: string
  device: 'dml' | 'cpu'
  engine: string
  gloss: boolean
  pivot: boolean
  maxMinutes?: number
}

function parseArgs(argv: string[]): Args {
  const a: Args = { langs: ['en', 'uk', 'ru'], device: 'dml', engine: 'nllb-600m-pivot', gloss: false, pivot: true }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--langs') a.langs = (argv[++i] ?? '').split(',').filter(l => NLLB[l])
    else if (arg === '--make') a.make = argv[++i]
    else if (arg === '--model') a.model = argv[++i]
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--offset') a.offset = Number(argv[++i])
    else if (arg === '--dump') a.dump = argv[++i]
    else if (arg === '--device') a.device = argv[++i] === 'cpu' ? 'cpu' : 'dml'
    else if (arg === '--engine') a.engine = argv[++i] ?? a.engine
    else if (arg === '--gloss') a.gloss = true
    else if (arg === '--direct') {
      a.pivot = false
      a.engine = 'nllb-600m'
    } else if (arg === '--max-minutes') a.maxMinutes = Number(argv[++i])
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

/** Sentence pieces of a text: translating them one by one keeps NLLB inside its comfortable length. */
const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9(])/)
    .filter(Boolean)

/** True when a segment translation looks broken: empty, runaway length, or the same word run repeated. */
function isDegenerate(source: string, out: string): boolean {
  if (!out.trim()) return true
  if (out.length > source.length * 3 + 40) return true
  if (source.length > 30 && out.length < source.length * 0.25) return true
  const words = out.toLowerCase().split(/\s+/)
  const seen = new Map<string, number>()
  for (let i = 0; i + 3 <= words.length; i++) {
    const gram = words.slice(i, i + 3).join(' ')
    const n = (seen.get(gram) ?? 0) + 1
    if (n >= 3) return true
    seen.set(gram, n)
  }
  return false
}

/** Translates segments one at a time (batches > 1 make fp16 NLLB hallucinate on padded input); null = unusable output. */
type Translator = (segments: string[], lang: string, from?: 'nl' | 'en') => Promise<(string | null)[]>

async function loadTranslator(args: Args): Promise<Translator> {
  env.cacheDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'models')
  const tr = await pipeline(
    'translation',
    MODEL,
    args.device === 'dml' ? { device: 'dml', dtype: 'fp16' } : { dtype: 'q8' }
  )
  const run = async (segment: string, lang: string, from: 'nl' | 'en', penalty: number): Promise<string> => {
    const res = (await tr(segment, {
      src_lang: from === 'en' ? 'eng_Latn' : 'nld_Latn',
      tgt_lang: NLLB[lang]!,
      max_length: 400,
      no_repeat_ngram_size: 4,
      repetition_penalty: penalty
    })) as { translation_text: string }[]
    return res[0]?.translation_text ?? ''
  }
  return async (segments, lang, from = 'nl') => {
    const out: (string | null)[] = []
    for (const segment of segments) {
      let text = await run(segment, lang, from, 1.15)
      if (isDegenerate(segment, text)) text = await run(segment, lang, from, 1.6)
      out.push(isDegenerate(segment, text) ? null : text)
    }
    return out
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const deadline = args.maxMinutes ? Date.now() + args.maxMinutes * 60_000 : Infinity
  const { db, close } = createDb()
  try {
    let query = db
      .selectDistinct({ defect: rdwRecalls.defect, consequences: rdwRecalls.consequences, remedy: rdwRecalls.remedy })
      .from(rdwRecalls)
      .$dynamic()
    if (args.make && args.model) {
      query = query
        .innerJoin(rdwRecallModels, eq(rdwRecallModels.referenceCode, rdwRecalls.referenceCode))
        .where(and(eq(rdwRecallModels.makeKey, args.make), eq(rdwRecallModels.modelKey, args.model)))
    }
    const rows = await query
    const texts = new Map<string, string>() // hash -> normalized Dutch text
    for (const r of rows) {
      for (const t of [r.defect, r.consequences, r.remedy]) {
        const text = t?.replace(/\s+/g, ' ').trim()
        if (text) texts.set(recallTextHash(text), text)
      }
    }
    log(`${rows.length} campaign text set(s) -> ${texts.size} distinct text(s)`)

    // English first: the pivot reuses it for uk / ru, whatever order --langs gave.
    const langs = [...args.langs].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : 0))
    const wanted = new Map<string, Set<string>>() // lang -> hashes still to translate
    for (const lang of langs) {
      const have = new Set<string>()
      if (!args.dump) {
        const done = await db
          .select({ h: rdwRecallTexts.textHash })
          .from(rdwRecallTexts)
          .where(and(eq(rdwRecallTexts.lang, lang), eq(rdwRecallTexts.engine, args.engine)))
        for (const d of done) have.add(d.h)
      }
      wanted.set(lang, new Set([...texts.keys()].filter(h => !have.has(h))))
    }
    // A text is worked on in every language at once, so a campaign becomes complete early.
    let work = [...texts].filter(([h]) => langs.some(l => wanted.get(l)!.has(h)))
    if (args.offset || args.limit)
      work = work.slice(args.offset ?? 0, args.limit ? (args.offset ?? 0) + args.limit : undefined)
    log(
      `to do: ${work.length} text(s); missing per language: ${langs.map(l => `${l} ${wanted.get(l)!.size}`).join(', ')}`
    )
    if (work.length === 0) return

    const translate = await loadTranslator(args)
    const english = new Map<string, string | null>() // Dutch segment -> English
    const byLang = new Map<string, Map<string, string | null>>(langs.map(l => [l, new Map()])) // lang -> Dutch segment -> out
    const dumpRows: string[] = []
    let stored = 0
    let failed = 0
    const t0 = Date.now()

    for (let c = 0; c < work.length; c += CHUNK) {
      if (Date.now() > deadline) {
        log(`--max-minutes reached: stopping with ${work.length - c} text(s) left (rerun to continue)`)
        break
      }
      const chunk = work.slice(c, c + CHUNK)
      const pieces = new Map(
        chunk.map(([h, text]) => [h, splitSentences(text).map(s => (args.gloss ? applyGlossary(s) : s))])
      )

      for (const lang of langs) {
        const mine = chunk.filter(([h]) => wanted.get(lang)!.has(h))
        if (mine.length === 0) continue
        const cache = byLang.get(lang)!
        const need = [...new Set(mine.flatMap(([h]) => pieces.get(h)!))].filter(s => !cache.has(s))

        if (args.pivot && lang !== 'en') {
          const missingEn = need.filter(s => !english.has(s))
          const en = await translate(missingEn, 'en')
          missingEn.forEach((s, i) => english.set(s, en[i] ?? null))
          const viaEn = need.filter(s => english.get(s))
          const out = await translate(
            viaEn.map(s => english.get(s)!),
            lang,
            'en'
          )
          viaEn.forEach((s, i) => cache.set(s, out[i] ?? null))
          for (const s of need) if (!cache.has(s)) cache.set(s, null)
        } else {
          const out = await translate(need, lang)
          need.forEach((s, i) => {
            cache.set(s, out[i] ?? null)
            if (lang === 'en') english.set(s, out[i] ?? null)
          })
        }

        const results: { hash: string; original: string; text: string }[] = []
        for (const [h, original] of mine) {
          const parts = pieces.get(h)!.map(s => cache.get(s) ?? null)
          if (parts.some(p => p === null)) {
            failed++
            log(`  ${lang}: no usable translation, keeping Dutch: ${original.slice(0, 80)}`)
            continue
          }
          results.push({ hash: h, original, text: parts.join(' ') })
        }
        if (args.dump) {
          for (const r of results)
            dumpRows.push(`### ${lang}\n**NL:** ${r.original}\n\n**${lang.toUpperCase()}:** ${r.text}\n`)
        } else if (results.length > 0) {
          await db
            .insert(rdwRecallTexts)
            .values(
              results.map(r => ({ textHash: r.hash, lang, engine: args.engine, text: r.text, quality: 'machine' }))
            )
            .onConflictDoNothing()
        }
        stored += results.length
      }
      const done = Math.min(c + CHUNK, work.length)
      const minutesLeft = (((work.length - done) * (Date.now() - t0)) / done / 60000).toFixed(0)
      log(`${done}/${work.length} text(s), ${stored} translation(s) stored, ${failed} failed, ~${minutesLeft} min left`)
    }
    if (args.dump) {
      await writeFile(args.dump, dumpRows.join('\n'))
      log(`wrote ${args.dump}`)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
