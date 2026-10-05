/**
 * Polite fetch + disk cache + robots.txt for the TopGear ingest (topgear.ts): ≤1 request/s, robots.txt read at runtime
 * and obeyed, raw HTML cached to scripts/.data/topgear/ (gitignored). The User-Agent omits the `(+https://carsua.app)`
 * contact suffix our other crawlers send — topgear.com's CDN answers that exact string with 403 (measured 2026-10-05).
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { isAllowed, parseRobots } from './infocar-robots.js'
import type { RobotsRules } from './infocar-robots.js'
import { TOPGEAR_ORIGIN } from './topgear-parse.js'

export const TOPGEAR_USER_AGENT = 'carsua.app-ingest/1.0'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'topgear')
const MIN_INTERVAL_MS = 1000

export const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

let lastRequestAt = 0

async function throttledFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  return fetch(url, { headers: { 'user-agent': TOPGEAR_USER_AGENT } })
}

/**
 * One cached page (`pathAndQuery` is e.g. `/car-reviews/kia/ceed` or `/sitemap.xml?page=1`): the HTML/XML, or `null`
 * for a 404 (cached as an empty file so it isn't re-requested) or a page robots.txt disallows.
 */
export async function getPage(pathAndQuery: string, rules: RobotsRules, refresh: boolean): Promise<string | null> {
  if (!isAllowed(rules, pathAndQuery)) {
    log(`  robots.txt disallows ${pathAndQuery} — skipped`)
    return null
  }
  const name = pathAndQuery.replace(/^\//, '').replace(/[/?=&]+/g, '__') || 'index'
  const cachePath = join(DATA_DIR, `${name}.html`)
  if (!refresh && existsSync(cachePath)) {
    const txt = await readFile(cachePath, 'utf8')
    return txt || null
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await throttledFetch(`${TOPGEAR_ORIGIN}${pathAndQuery}`)
      if (res.status === 404) {
        await mkdir(dirname(cachePath), { recursive: true })
        await writeFile(cachePath, '')
        return null
      }
      if (!res.ok) throw new Error(`status ${res.status}`)
      const txt = await res.text()
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, txt)
      return txt
    } catch (err) {
      if (attempt >= 3) {
        log(`  ${pathAndQuery}: giving up after ${attempt} attempts (${String(err)}) — skipped, re-run to retry`)
        return null
      }
      await sleep(attempt * 3000)
    }
  }
}

export async function loadRobots(refresh: boolean): Promise<RobotsRules> {
  const cachePath = join(DATA_DIR, 'robots.txt')
  let txt: string
  if (!refresh && existsSync(cachePath)) {
    txt = await readFile(cachePath, 'utf8')
  } else {
    const res = await throttledFetch(`${TOPGEAR_ORIGIN}/robots.txt`)
    if (!res.ok) throw new Error(`robots.txt: status ${res.status}`)
    txt = await res.text()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(cachePath, txt)
  }
  return parseRobots(txt, TOPGEAR_USER_AGENT)
}
