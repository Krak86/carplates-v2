/**
 * Polite, cached Wikipedia/Wikidata fetching for brand pronunciation (probe + ingest). Responses are cached as JSON in
 * scripts/.data/brand-pronounce/ (gitignored); `refresh` bypasses the cache. One request at a time, `DELAY_MS` apart.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Wiki } from './brand-pronounce-parse.js'

export const WIKIS = ['en', 'uk', 'ru'] as const satisfies readonly Wiki[]
export type Titles = Partial<Record<Wiki, string>>
export type LeadPage = { wikitext: string; revid: number | null; title: string | null }

const UA = 'carsua-research/1.0 (https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'brand-pronounce')
const DELAY_MS = 400
const safe = (s: string): string => s.replace(/[^\w-]/g, '_')

type ParseResponse = { parse?: { title?: string; revid?: number; wikitext: { '*': string } } }

export type CommonsFile = { name: string; url: string; author: string | null; license: string | null }

type CommonsInfoResponse = {
  query?: {
    pages: Record<
      string,
      {
        title?: string
        imageinfo?: { url: string; extmetadata?: Record<string, { value?: string } | undefined> }[]
      }
    >
  }
}

export type Fetcher = {
  commonsInfo: (fileName: string) => Promise<CommonsFile | null>
  commonsSearch: (query: string) => Promise<string[]>
  sitelinks: (qids: string[]) => Promise<Map<string, Titles>>
  searchEn: (name: string) => Promise<string | null>
  lead: (lang: Wiki, title: string) => Promise<LeadPage>
}

export function createFetcher(refresh: boolean): Fetcher {
  let last = 0
  async function getJson<T>(url: string): Promise<T> {
    const wait = last + DELAY_MS - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    last = Date.now()
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return (await res.json()) as T
  }

  async function cached<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const file = join(DATA_DIR, `${name}.json`)
    if (!refresh && existsSync(file)) return JSON.parse(await readFile(file, 'utf8')) as T
    const value = await fn()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(file, JSON.stringify(value))
    return value
  }

  /** QID -> enwiki / ukwiki / ruwiki article titles (Wikidata sitelinks), 50 ids per request. */
  async function sitelinks(qids: string[]): Promise<Map<string, Titles>> {
    const out = new Map<string, Titles>()
    for (let i = 0; i < qids.length; i += 50) {
      const ids = qids.slice(i, i + 50)
      const data = await cached(`sitelinks-${ids[0]}-${ids.length}`, () =>
        getJson<{ entities: Record<string, { sitelinks?: Record<string, { title: string }> }> }>(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki|ukwiki|ruwiki&ids=${ids.join('|')}`
        )
      )
      for (const [id, e] of Object.entries(data.entities)) {
        out.set(id, { en: e.sitelinks?.enwiki?.title, uk: e.sitelinks?.ukwiki?.title, ru: e.sitelinks?.ruwiki?.title })
      }
    }
    return out
  }

  /** First en.wikipedia search hit for "<name> automobile manufacturer" (fallback when a make has no QID). */
  async function searchEn(name: string): Promise<string | null> {
    const q = encodeURIComponent(`${name} automobile manufacturer`)
    const data = await cached(`search-${safe(name)}`, () =>
      getJson<{ query?: { search: { title: string }[] } }>(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&srsearch=${q}`
      )
    )
    return data.query?.search[0]?.title ?? null
  }

  /** Lead section wikitext + revision id; an unreachable or missing page gives an empty wikitext. */
  async function lead(lang: Wiki, title: string): Promise<LeadPage> {
    const data = await cached(`lead-${lang}-${safe(title)}`, () =>
      getJson<ParseResponse>(
        `https://${lang}.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext|revid&section=0&redirects=1&page=${encodeURIComponent(title)}`
      ).catch((): ParseResponse => ({}))
    )
    return {
      wikitext: data.parse?.wikitext['*'] ?? '',
      revid: data.parse?.revid ?? null,
      title: data.parse?.title ?? null
    }
  }

  /** Direct URL, author and licence of a Commons file (imageinfo + extmetadata); null when the file does not exist. */
  async function commonsInfo(fileName: string): Promise<CommonsFile | null> {
    const title = encodeURIComponent(`File:${fileName}`)
    const data = await cached(`commons-info-${safe(fileName)}`, () =>
      getJson<CommonsInfoResponse>(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url|extmetadata&titles=${title}`
      ).catch((): CommonsInfoResponse => ({}))
    )
    const page = Object.values(data.query?.pages ?? {})[0]
    const info = page?.imageinfo?.[0]
    if (!info) return null
    const meta = info.extmetadata ?? {}
    return {
      name: page?.title?.replace(/^File:/, '') ?? fileName,
      url: info.url,
      author: meta.Artist?.value ?? null,
      license: meta.LicenseShortName?.value ?? null
    }
  }

  /** File names (no `File:` prefix) of the Commons audio files whose title matches the query. */
  async function commonsSearch(query: string): Promise<string[]> {
    const q = encodeURIComponent(query)
    const data = await cached(`commons-search-${safe(query)}`, () =>
      getJson<{ query?: { search: { title: string }[] } }>(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=10&srsearch=${q}`
      ).catch(() => ({}) as { query?: { search: { title: string }[] } })
    )
    return (data.query?.search ?? []).map(h => h.title.replace(/^File:/, ''))
  }

  return { sitelinks, searchEn, lead, commonsInfo, commonsSearch }
}
