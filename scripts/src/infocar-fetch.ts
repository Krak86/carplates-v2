/**
 * Polite fetch + disk cache + robots.txt for the infocar.ua ingests (infocar.ts, infocar-videos.ts): ≤1 request/s,
 * honest User-Agent, robots.txt read at runtime and obeyed, raw HTML cached to scripts/.data/infocar/ (gitignored).
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { INFOCAR_ORIGIN, decodeInfocarHtml } from './infocar-parse.js'
import { isAllowed, parseRobots } from './infocar-robots.js'
import type { RobotsRules } from './infocar-robots.js'

export const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'infocar')
const MIN_INTERVAL_MS = 1000

export const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

let lastRequestAt = 0

/** Polite fetch: at most one request per MIN_INTERVAL_MS. */
async function throttledFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  return fetch(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'uk' } })
}

/** One cached page: the decoded HTML, or `null` for a 404 (cached as an empty file so it isn't re-requested). */
export async function getPage(path: string, rules: RobotsRules, refresh: boolean): Promise<string | null> {
  if (!isAllowed(rules, path)) {
    log(`  robots.txt disallows ${path} — skipped`)
    return null
  }
  const cachePath = join(DATA_DIR, `${path.replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'index'}.html`)
  if (!refresh && existsSync(cachePath)) {
    const buf = await readFile(cachePath)
    return buf.length ? decodeInfocarHtml(buf) : null
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await throttledFetch(`${INFOCAR_ORIGIN}${path}`)
      if (res.status === 404) {
        await mkdir(dirname(cachePath), { recursive: true })
        await writeFile(cachePath, '')
        return null
      }
      if (!res.ok) throw new Error(`status ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, buf)
      return decodeInfocarHtml(buf)
    } catch (err) {
      if (attempt >= 3) {
        log(`  ${path}: giving up after ${attempt} attempts (${String(err)}) — skipped, re-run to retry`)
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
    const res = await throttledFetch(`${INFOCAR_ORIGIN}/robots.txt`)
    if (!res.ok) throw new Error(`robots.txt: status ${res.status}`)
    txt = await res.text()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(cachePath, txt)
  }
  return parseRobots(txt, USER_AGENT)
}
