import { describe, it, expect } from 'vitest'

import { modelFamily } from './modelFamily.js'

describe('modelFamily', () => {
  it('merges every Lanos spelling into one Daewoo family', () => {
    for (const [brand, model] of [
      ['DAEWOO', 'LANOS'],
      ['DAEWOO  LANOS', 'LANOS'],
      ['ЗАЗ  LANOS', 'LANOS'],
      ['ЗАЗ-DAEWOO', 'LANOS'],
      ['DAEWOO  FSO LANOS TF69Y', 'FSO LANOS TF69Y'],
      ['DAEWOO  LANOSD4LM500', 'LANOSD4LM500']
    ] as const) {
      expect(modelFamily(brand, model)).toEqual({ brand: 'Daewoo', family: 'Lanos' })
    }
  })

  it('keeps Chevrolet Lanos separate', () => {
    expect(modelFamily('CHEVROLET  LANOS', 'LANOS')).toEqual({ brand: 'Chevrolet', family: 'Lanos' })
    expect(modelFamily('CHEVROLET', 'CRUZE')).toBeNull()
  })

  it('maps Sens by name or by its T1311x / T13010 code', () => {
    expect(modelFamily('ЗАЗ  SENS', 'SENS')?.family).toBe('Sens')
    expect(modelFamily('DAEWOO', 'SENS T1311')?.family).toBe('Sens')
    expect(modelFamily('ЗАЗ-DAEWOO  T13110', 'T13110')?.family).toBe('Sens')
    expect(modelFamily('DAEWOO', 'SENS T13010')?.family).toBe('Sens')
  })

  it('maps Vida / Forza / Chance and the 11xx codes', () => {
    expect(modelFamily('ЗАЗ', 'VIDA CARGO')).toEqual({ brand: 'ZAZ', family: 'Vida' })
    expect(modelFamily('ЗАЗ  FORZA', 'FORZA')?.family).toBe('Forza')
    expect(modelFamily('ЗАЗ  TF698K', 'TF698K')?.family).toBe('Chance')
    expect(modelFamily('ЗАЗ  110307-42', '110307-42')?.family).toBe('Slavuta')
    expect(modelFamily('ЗАЗ', '110206')?.family).toBe('Tavria')
    expect(modelFamily('ЗАЗ  11027', '11027')?.family).toBe('Tavria')
    expect(modelFamily('ЗАЗ  110557', '110557')?.family).toBe('Dana')
    expect(modelFamily('ЗАЗ  968М', '968М')?.family).toBe('968')
  })

  it('names the other Daewoo models', () => {
    expect(modelFamily('DAEWOO  MATIZ', 'MATIZ')?.family).toBe('Matiz')
    expect(modelFamily('DAEWOO  NEXIA 1.5 GL', 'NEXIA 1.5 GL')?.family).toBe('Nexia')
    expect(modelFamily('ЗАЗ-DAEWOO  NUBIRA', 'NUBIRA')?.family).toBe('Nubira')
  })

  it('ignores look-alike names from other brands', () => {
    expect(modelFamily('VOLKSWAGEN', 'E-LAVIDA')).toBeNull()
    expect(modelFamily('HONDA', 'FORZA 250')).toBeNull()
    expect(modelFamily('SPUTNIK  SENSOR', 'SENSOR')).toBeNull()
    expect(modelFamily('ВАЗ', '2107')).toBeNull()
  })
})
