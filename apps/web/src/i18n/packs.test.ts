import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PACKS, PACK_NAMES } from '@/i18n/packs'
import ua from '@/i18n/ua.json'

const ROOT = join(import.meta.dirname, '..', '..')

const sourceFiles = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return entry.name === 'i18n' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

const FILES = sourceFiles('src').map(path => ({ path, text: readFileSync(join(ROOT, path), 'utf8') }))

describe('dictionary packs', () => {
  it('every pack prefix exists in ua', () => {
    const heads = new Set(Object.keys(ua).map(key => key.split('.')[0]))
    for (const name of PACK_NAMES) for (const prefix of PACKS[name].prefixes) expect(heads.has(prefix)).toBe(true)
  })

  it('no prefix is claimed by two packs', () => {
    const all = PACK_NAMES.flatMap(name => [...PACKS[name].prefixes])
    expect(all.length).toBe(new Set(all).size)
  })

  // A file outside the owners would render the raw key until the pack happens to be loaded.
  it.each(PACK_NAMES)('only the owners of the %s pack reference its keys', name => {
    const { prefixes, owners } = PACKS[name]
    const re = new RegExp(`['"\`](${prefixes.join('|')})\\.`)
    const strangers = FILES.filter(f => re.test(f.text) && !owners.some(o => f.path === o || f.path.startsWith(o)))
    expect(strangers.map(f => f.path)).toEqual([])
  })
})
