/**
 * Seed CSV dump/load of `registry.brand_pronunciation` (`--export-csv` / `--from-csv` of `ingest:brand-pronounce`).
 * A seed is the whole table: loading replaces it. The audio table has its own seed (`brand-pronunciation-audio.csv.gz`, next to this one).
 */
import { brandPronunciation, brandPronunciationAudio } from '@carplates/db'
import type { BrandPronunciationAudioInsert, BrandPronunciationInsert, Db } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'

const BATCH = 1000
const COLUMNS = ['brand_slug', 'lang', 'ipa', 'ipa_lang', 'respell', 'source', 'rev'] as const

export async function exportBrandPronunciation(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(brandPronunciation).orderBy(brandPronunciation.brandSlug, brandPronunciation.lang)
  const size = await writeCsv(
    path,
    COLUMNS,
    rows.map(r => ({
      brand_slug: r.brandSlug,
      lang: r.lang,
      ipa: r.ipa ?? '',
      ipa_lang: r.ipaLang ?? '',
      respell: r.respell ?? '',
      source: r.source,
      rev: r.rev ?? ''
    }))
  )
  console.log(`exported ${rows.length} pronunciation row(s) to ${path} (${(size / 1024).toFixed(1)} KB)`)
}

export async function importBrandPronunciation(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no brand-pronunciation seed at ${path} (run pnpm export:brand-pronounce:csv first)`)
    return
  }
  const rows: BrandPronunciationInsert[] = csv.records.map(r => ({
    brandSlug: r.brand_slug!,
    lang: r.lang!,
    ipa: r.ipa || null,
    ipaLang: r.ipa_lang || null,
    respell: r.respell || null,
    source: r.source!,
    rev: r.rev ? Number(r.rev) : null
  }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.brand_pronunciation`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(brandPronunciation)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  console.log(`loaded ${rows.length} pronunciation row(s)`)
}

const AUDIO_COLUMNS = ['brand_slug', 'lang', 'url', 'author', 'license', 'kind'] as const

/** Seed path of the audio table that goes with a pronunciation seed path. */
export const audioSeedPath = (path: string): string =>
  path.replace(/brand-pronunciation(?=.)/, 'brand-pronunciation-audio')

export async function exportBrandPronunciationAudio(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(brandPronunciationAudio).orderBy(brandPronunciationAudio.brandSlug)
  const size = await writeCsv(
    path,
    AUDIO_COLUMNS,
    rows.map(r => ({
      brand_slug: r.brandSlug,
      lang: r.lang,
      url: r.url,
      author: r.author ?? '',
      license: r.license ?? '',
      kind: r.kind
    }))
  )
  console.log(`exported ${rows.length} pronunciation audio row(s) to ${path} (${(size / 1024).toFixed(1)} KB)`)
}

export async function importBrandPronunciationAudio(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no brand-pronunciation audio seed at ${path}`)
    return
  }
  const rows: BrandPronunciationAudioInsert[] = csv.records.map(r => ({
    brandSlug: r.brand_slug!,
    lang: r.lang!,
    url: r.url!,
    author: r.author || null,
    license: r.license || null,
    kind: r.kind!
  }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.brand_pronunciation_audio`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(brandPronunciationAudio)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  console.log(`loaded ${rows.length} pronunciation audio row(s)`)
}
