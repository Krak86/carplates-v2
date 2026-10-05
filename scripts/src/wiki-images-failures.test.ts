import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FailureLog } from './wiki-images-failures.js'

const entry = (stage: 'search' | 'imageinfo', model: string, httpStatus: number | null) => ({
  stage,
  brand: 'kia',
  model,
  httpStatus,
  error: 'boom',
  attempts: 3
})

describe('FailureLog', () => {
  it('persists every entry immediately, survives a restart, and summarizes by status and stage', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'wikifail-')), 'failed.json')
    const log = new FailureLog(path)
    log.add(entry('search', 'ceed', 429))
    log.add(entry('search', 'rio', 429))
    log.add({ ...entry('imageinfo', 'rio', null), titles: ['File:a.jpg'] })

    expect(JSON.parse(readFileSync(path, 'utf8'))).toHaveLength(3)
    const reloaded = new FailureLog(path)
    expect(reloaded.models()).toEqual([
      { brand: 'kia', model: 'ceed' },
      { brand: 'kia', model: 'rio' }
    ])
    expect(reloaded.summary()).toBe('429 × 2 (search 2), timeout/network × 1 (imageinfo 1)')
  })

  it('clears all entries of a model once it succeeds', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'wikifail-')), 'failed.json')
    const log = new FailureLog(path)
    log.add(entry('search', 'ceed', 503))
    log.add(entry('imageinfo', 'ceed', 503))
    log.add(entry('search', 'rio', 503))

    log.clearModel('kia', 'ceed')

    expect(log.all.map(e => e.model)).toEqual(['rio'])
    expect(new FailureLog(path).models()).toEqual([{ brand: 'kia', model: 'rio' }])
    expect(new FailureLog(join(mkdtempSync(join(tmpdir(), 'wikifail-')), 'none.json')).summary()).toBeNull()
  })
})
