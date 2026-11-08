/**
 * Loads how each catalog make is pronounced (ua / ru / en transcription) into `registry.brand_pronunciation`, from the Wikipedia
 * lead wikitext (en IPA / IPAc-en, uk {{lang-uk}}, ru МФА) plus the hand-written `brand-pronounce-overrides.csv`.
 * Article titles come from Wikidata sitelinks (QID in `brand_origin_period.source`), en search as the fallback.
 * Also fills `registry.brand_pronunciation_audio`: the audio file named in the en lead (else a strict Commons title search),
 * with author + licence from the Commons imageinfo API; kept only when free-licensed and in the make's origin language.
 * Raw responses are cached in scripts/.data/brand-pronounce/ (gitignored); `--refresh` re-fetches. Safe to repeat: the rows of
 * every catalog make are replaced in one transaction.
 *
 *   pnpm ingest:brand-pronounce              # fetch (cached), parse, merge overrides, write
 *   pnpm ingest:brand-pronounce --dry-run    # same, print a summary, write nothing
 *   pnpm ingest:brand-pronounce --refresh    # ignore the cache
 *   pnpm export:brand-pronounce:csv          # dump the table to seed-data/brand-pronunciation.csv.gz
 *   pnpm ingest:brand-pronounce:csv          # load that seed (replaces the table)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { brandOriginPeriod, brandPronunciation, brandPronunciationAudio, catalogMake, createDb } from '@carplates/db'
import type { BrandPronunciationAudioInsert, BrandPronunciationInsert } from '@carplates/db'
import { inArray } from 'drizzle-orm'

import { cleanAuthor, cleanLicense, fileLang, isFreeLicense, matchesMake, originLang } from './brand-pronounce-audio.js'
import { createFetcher, WIKIS } from './brand-pronounce-fetch.js'
import type { Fetcher, Titles } from './brand-pronounce-fetch.js'
import { parseLead } from './brand-pronounce-parse.js'
import type { Wiki } from './brand-pronounce-parse.js'
import { buildRows, parseOverrides } from './brand-pronounce-rows.js'
import type { LeadInput } from './brand-pronounce-rows.js'
import {
  audioSeedPath,
  exportBrandPronunciation,
  exportBrandPronunciationAudio,
  importBrandPronunciation,
  importBrandPronunciationAudio
} from './pronounce-csv.js'

const OVERRIDES_PATH = join(import.meta.dirname, 'brand-pronounce-overrides.csv')
const log = (...m: unknown[]): void => {
  console.log(...m)
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i < 0 ? undefined : (process.argv[i + 1] ?? '')
}

type Clip = { lang: string; url: string; author: string | null; license: string | null }

/**
 * First usable Commons clip of a make: the file the en lead names, then the title-search hits (both must be about the make itself). Usable = exists, free
 * licence, language known and equal to the make's origin language (a German brand read in English is not played).
 */
async function findAudio(
  fetcher: Fetcher,
  makeName: string,
  named: string | null,
  origin: string | null
): Promise<Clip | null> {
  if (!origin) return null
  const candidates = named && matchesMake(named, makeName) ? [named] : []
  for (const hit of await fetcher.commonsSearch(`${makeName} pronunciation`)) {
    if (matchesMake(hit, makeName) && !candidates.includes(hit)) candidates.push(hit)
  }
  for (const name of candidates) {
    if (fileLang(name) !== origin) continue
    const file = await fetcher.commonsInfo(name)
    const license = cleanLicense(file?.license ?? undefined)
    if (!file || !isFreeLicense(license)) continue
    return { lang: origin, url: file.url.split('?')[0]!, author: cleanAuthor(file.author ?? undefined), license }
  }
  return null
}

async function main(): Promise<void> {
  const exportCsv = flag('--export-csv')
  const fromCsv = flag('--from-csv')
  const dryRun = process.argv.includes('--dry-run')
  const { db, close } = createDb()
  try {
    if (exportCsv) {
      await exportBrandPronunciation(db, exportCsv)
      return await exportBrandPronunciationAudio(db, audioSeedPath(exportCsv))
    }
    if (fromCsv) {
      await importBrandPronunciation(db, fromCsv)
      return await importBrandPronunciationAudio(db, audioSeedPath(fromCsv))
    }

    const makes = await db.select().from(catalogMake)
    const slugs = makes.map(m => m.makeSlug)
    const origin = slugs.length
      ? await db
          .select({ slug: brandOriginPeriod.brandSlug, source: brandOriginPeriod.source })
          .from(brandOriginPeriod)
          .where(inArray(brandOriginPeriod.brandSlug, slugs))
      : []
    const qidOf = new Map<string, string>()
    for (const o of origin) {
      const q = /Q\d+/.exec(o.source)?.[0]
      if (q && !qidOf.has(o.slug)) qidOf.set(o.slug, q)
    }
    log(`catalog makes: ${makes.length}, with a Wikidata id: ${qidOf.size}`)

    const fetcher = createFetcher(process.argv.includes('--refresh'))
    const links = await fetcher.sitelinks([...new Set(qidOf.values())])
    const overrides = parseOverrides(readFileSync(OVERRIDES_PATH, 'utf8'))

    const countryOf = new Map<string, string>()
    if (slugs.length) {
      const current = await db
        .select({ slug: brandOriginPeriod.brandSlug, country: brandOriginPeriod.countryCode })
        .from(brandOriginPeriod)
        .where(inArray(brandOriginPeriod.brandSlug, slugs))
        .orderBy(brandOriginPeriod.fromYear)
      for (const c of current) countryOf.set(c.slug, c.country)
    }

    const rows: BrandPronunciationInsert[] = []
    const audio: BrandPronunciationAudioInsert[] = []
    const perLang = new Map<string, number>()
    for (const m of makes) {
      const qid = qidOf.get(m.makeSlug)
      const titles: Titles = { ...(qid ? links.get(qid) : undefined) }
      titles.en ??= (await fetcher.searchEn(m.makeName)) ?? undefined
      const leads: Partial<Record<Wiki, LeadInput>> = {}
      for (const wiki of WIKIS) {
        const title = titles[wiki]
        if (!title) continue
        const page = await fetcher.lead(wiki, title)
        if (page.wikitext) leads[wiki] = { lead: parseLead(wiki, page.wikitext), revid: page.revid }
      }
      const found = await findAudio(
        fetcher,
        m.makeName,
        leads.en?.lead.audio ?? null,
        originLang(countryOf.get(m.makeSlug))
      )
      if (found) audio.push({ brandSlug: m.makeSlug, kind: 'commons', ...found })
      for (const r of buildRows(m.makeSlug, leads, overrides)) {
        rows.push(r)
        perLang.set(r.lang, (perLang.get(r.lang) ?? 0) + 1)
      }
    }
    const withAny = new Set(rows.map(r => r.brandSlug)).size
    log(
      `rows: ${rows.length} (${[...perLang].map(([l, n]) => `${l} ${n}`).join(', ')}); makes with any pronunciation: ${withAny}/${makes.length}`
    )
    log(`audio clips: ${audio.length}/${makes.length} (${audio.map(a => `${a.brandSlug} ${a.lang}`).join(', ')})`)
    const withRespell = new Map<string, Set<string>>()
    for (const r of rows)
      if (r.respell) withRespell.set(r.brandSlug, (withRespell.get(r.brandSlug) ?? new Set()).add(r.lang))
    const needOverrides = slugs.filter(s => (withRespell.get(s)?.size ?? 0) < 3)
    if (needOverrides.length)
      log(
        `WARNING makes without a ua + ru + en respelling (add them to brand-pronounce-overrides.csv): ${needOverrides.join(', ')}`
      )
    const unusedOverrides = [...overrides.keys()].filter(k => !slugs.includes(k.split('|')[0]!))
    if (unusedOverrides.length) log(`overrides for makes not in the catalog: ${unusedOverrides.join(', ')}`)
    if (dryRun) return log('dry run: nothing written')

    await db.transaction(async tx => {
      if (slugs.length) await tx.delete(brandPronunciation).where(inArray(brandPronunciation.brandSlug, slugs))
      for (let i = 0; i < rows.length; i += 500) await tx.insert(brandPronunciation).values(rows.slice(i, i + 500))
      if (slugs.length)
        await tx.delete(brandPronunciationAudio).where(inArray(brandPronunciationAudio.brandSlug, slugs))
      if (audio.length) await tx.insert(brandPronunciationAudio).values(audio)
    })
    log('written to registry.brand_pronunciation')
  } finally {
    await close()
  }
}

await main()
