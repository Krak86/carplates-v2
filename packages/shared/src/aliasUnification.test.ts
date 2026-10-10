import { describe, it, expect } from 'vitest'

import { modelFamily, zazFactoryFamily } from './modelFamily.js'
import { matchVdbModelAcrossMakes, vdbCandidateKeys, vdbRelatedMakeKeys, type ModelReferenceRow } from './vdbMatch.js'
import { wikiSearchName } from './wikiAliases.js'

const row = (makeKey: string, modelKey: string): ModelReferenceRow => ({ kind: 'car', makeKey, modelKey, aliases: [] })

describe('ZAZ / Daewoo alias source', () => {
  it('puts every Lanos spelling in one family', () => {
    for (const [brand, model] of [
      ['ЗАЗ', 'lanos'],
      ['chevrolet', 'lanos'],
      ['daewoo', 'lanos 1.5'],
      ['fso', 'lanos']
    ] as const) {
      expect(modelFamily(brand, model)?.family).toBe('Lanos')
    }
  })

  it('reaches Sens from both the T13010 and the T1311x codes, in the family and in the photo search', () => {
    for (const code of ['t13010', 't13110', 't13111']) {
      expect(modelFamily('заз-daewoo', code)?.family).toBe('Sens')
      expect(zazFactoryFamily(code, true)).toBe('Sens')
      expect(wikiSearchName('заз-daewoo', code)).toMatchObject({ brand: 'ZAZ', model: 'Sens' })
    }
  })

  it('reads a factory code only at the start in leading mode', () => {
    expect(zazFactoryFamily('lanos t13110')).toBe('Sens')
    expect(zazFactoryFamily('lanos t13110', true)).toBeNull()
    expect(zazFactoryFamily('11020616', true)).toBe('Tavria')
  })

  it('offers the family keys to the matcher after the direct ones', () => {
    expect(vdbCandidateKeys('chevrolet', 'lanos').map(c => c.key)).toEqual(['lanos', 'daewoolanos'])
    expect(vdbCandidateKeys('zaz', 'T13010').map(c => c.key)).toEqual(['t13010', 'sens', 'zazsens'])
    expect(vdbCandidateKeys('toyota', 'camry').map(c => c.key)).toEqual(['camry'])
  })

  it('looks in the Daewoo and ZAZ catalogs for a family row only', () => {
    expect(vdbRelatedMakeKeys('zaz', 'lanos')).toEqual(['zaz', 'daewoo'])
    expect(vdbRelatedMakeKeys('chevrolet', 'lanos')).toEqual(['chevrolet', 'daewoo', 'zaz'])
    expect(vdbRelatedMakeKeys('chevrolet', 'cruze')).toEqual(['chevrolet'])
  })

  it('lands ZAZ / Chevrolet / Daewoo Lanos on the same catalog row', () => {
    const rows = [row('daewoo', 'lanos'), row('daewoo', 'sens'), row('chevrolet', 'lacetti')]
    for (const mk of ['zaz', 'chevrolet', 'daewoo', 'fso']) {
      expect(matchVdbModelAcrossMakes(rows, mk, 'lanos')?.row.modelKey).toBe('lanos')
    }
    expect(matchVdbModelAcrossMakes(rows, 'zaz', 'T13010')?.row.modelKey).toBe('sens')
  })

  it("lands Daewoo Lanos on RDW's glued key", () => {
    expect(matchVdbModelAcrossMakes([row('daewoo', 'daewoolanos')], 'zaz', 'lanos')?.how).toBe('alias')
  })

  it('maps the largest not_found photo rows to a searchable name', () => {
    expect(wikiSearchName('geely', 'jl7162')).toMatchObject({ brand: 'Geely', model: 'MK' })
    expect(wikiSearchName('geely jl7162 знг', 'jl7162 знг')?.model).toBe('MK')
    expect(wikiSearchName('chrysler', 'gr.voyager')).toMatchObject({ brand: 'Chrysler', model: 'Grand Voyager' })
    expect(wikiSearchName('citroen', 'c1sx')?.model).toBe('C1')
    expect(wikiSearchName('skoda', 'octavia a8')).toMatchObject({ brand: 'Skoda', model: 'Octavia' })
    expect(wikiSearchName('skoda', 'octavia a5')).toBeNull()
  })

  it('keeps the own make first and still hides a miss', () => {
    const own = row('zaz', 'lanos')
    expect(matchVdbModelAcrossMakes([row('daewoo', 'lanos'), own], 'zaz', 'lanos')?.row).toBe(own)
    expect(matchVdbModelAcrossMakes([row('daewoo', 'matiz')], 'chevrolet', 'lanos')).toBeNull()
  })
})
