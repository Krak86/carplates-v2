/**
 * Loads official manufacturer links (configurator, model page) into `registry.oem_links` for the virtual showroom. Link-out only: no
 * manufacturer content is copied or embedded. Sources are the makes whose robots.txt allows it and whose pages expose a stable
 * link: Morgan, Lucid and Koenigsegg are fixed lists, Aston Martin and Lamborghini are read from their model pages.
 * Toyota disallows `/configurator*`, Mercedes / Tesla / Porsche block automated clients: none of them is fetched.
 *
 *   pnpm ingest:oem-links                 # fetch pages, replace the table
 *   pnpm ingest:oem-links --dry-run       # fetch + print, write nothing
 *   pnpm ingest:oem-links --export-csv seed-data/oem-links.csv.gz   # dump the table
 *   pnpm ingest:oem-links --from-csv seed-data/oem-links.csv.gz     # load a dump (replaces the table), no network
 */
import { createDb } from '@carplates/db'
import type { OemLinkInsert } from '@carplates/db'

import { exportOemLinks, importOemLinks, replaceOemLinks } from './oem-csv.js'
import {
  ASTON_SOURCE_URL,
  KOENIGSEGG_LINKS,
  LAMBORGHINI_PAGES,
  LUCID_LINKS,
  MORGAN_LINKS,
  dedupeLinks,
  lamborghiniPageUrl,
  parseAstonConfigurators,
  parseLamborghiniOwnConfigurator
} from './oem-links-parse.js'
import type { OemLink } from './oem-links-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const TIMEOUT_MS = 60_000

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.text()
}

/** A failing source is reported and skipped: the rest of the table is still worth loading. */
async function safely(name: string, run: () => Promise<OemLink[]>): Promise<OemLink[]> {
  try {
    const links = await run()
    log(`${name}: ${links.length} link(s)`)
    return links
  } catch (err) {
    console.warn(`${name}: skipped (${err instanceof Error ? err.message : String(err)})`)
    return []
  }
}

async function lamborghini(): Promise<OemLink[]> {
  const links: OemLink[] = []
  for (const page of LAMBORGHINI_PAGES) {
    const url = lamborghiniPageUrl(page.path)
    const configurator = parseLamborghiniOwnConfigurator(await fetchText(url))
    const base = { makeSlug: 'lamborghini', modelSlug: page.model, variant: page.variant }
    links.push({ ...base, kind: 'model-page', url })
    if (configurator) links.push({ ...base, kind: 'configurator', url: configurator })
  }
  return links
}

async function collect(): Promise<OemLink[]> {
  const sources = await Promise.all([
    safely('aston-martin', async () => parseAstonConfigurators(await fetchText(ASTON_SOURCE_URL))),
    safely('lamborghini', lamborghini)
  ])
  return dedupeLinks([...MORGAN_LINKS, ...LUCID_LINKS, ...KOENIGSEGG_LINKS, ...sources.flat()])
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const valueOf = (flag: string): string | undefined => argv[argv.indexOf(flag) + 1]
  const exportCsv = argv.includes('--export-csv') ? valueOf('--export-csv') : undefined
  const fromCsv = argv.includes('--from-csv') ? valueOf('--from-csv') : undefined

  if (exportCsv || fromCsv) {
    const { db, close } = createDb()
    try {
      if (exportCsv) await exportOemLinks(db, exportCsv)
      else if (fromCsv) await importOemLinks(db, fromCsv)
    } finally {
      await close()
    }
    return
  }

  const links = await collect()
  log(`${links.length} official link(s), ${new Set(links.map(l => l.makeSlug)).size} make(s)`)
  if (argv.includes('--dry-run')) {
    for (const l of links) log(`  ${l.makeSlug}/${l.modelSlug} ${l.variant} [${l.kind}] ${l.url}`)
    log('dry-run: nothing written')
    return
  }
  const rows: OemLinkInsert[] = links.map(l => ({ ...l, updatedAt: new Date() }))
  const { db, close } = createDb()
  try {
    await replaceOemLinks(db, rows)
    log(`written ${rows.length} link(s) to registry.oem_links`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
