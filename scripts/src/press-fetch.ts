/**
 * Polite fetch + disk cache + robots.txt for the tech-press ingest (press.ts): ≤1 request/s across both sites,
 * robots.txt read at runtime per host and obeyed, raw HTML cached to scripts/.data/press/<host>/ (gitignored).
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { isAllowed, parseRobots } from './infocar-robots.js'
import type { RobotsRules } from './infocar-robots.js'

export const PRESS_USER_AGENT = 'carsua.app-ingest/1.0'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'press')
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
  return fetch(url, { headers: { 'user-agent': PRESS_USER_AGENT } })
}

const cachePathOf = (url: URL): string =>
  join(
    DATA_DIR,
    url.host,
    `${(url.pathname + url.search).replace(/^\//, '').replace(/[/?=&]+/g, '__') || 'index'}.html`
  )

/**
 * One cached page by absolute URL: its HTML, or `null` for a 404 (cached as an empty file so it isn't re-requested), a
 * page robots.txt disallows or a fetch that failed three times.
 */
export async function getPage(href: string, rules: RobotsRules, refresh: boolean): Promise<string | null> {
  const url = new URL(href)
  if (!isAllowed(rules, url.pathname + url.search)) {
    log(`  robots.txt disallows ${href} — skipped`)
    return null
  }
  const cachePath = cachePathOf(url)
  if (!refresh && existsSync(cachePath)) return (await readFile(cachePath, 'utf8')) || null
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await throttledFetch(href)
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
        log(`  ${href}: giving up after ${attempt} attempts (${String(err)}) — skipped, re-run to retry`)
        return null
      }
      await sleep(attempt * 3000)
    }
  }
}

export async function loadRobots(origin: string, refresh: boolean): Promise<RobotsRules> {
  const cachePath = join(DATA_DIR, new URL(origin).host, 'robots.txt')
  let txt: string
  if (!refresh && existsSync(cachePath)) {
    txt = await readFile(cachePath, 'utf8')
  } else {
    const res = await throttledFetch(`${origin}/robots.txt`)
    if (!res.ok) throw new Error(`${origin}/robots.txt: status ${res.status}`)
    txt = await res.text()
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, txt)
  }
  return parseRobots(txt, PRESS_USER_AGENT)
}
