import { describe, expect, it } from 'vitest'

import { localizeRegistryRows, registryLabel } from './registryLabels.js'

describe('registryLabel', () => {
  it('translates for ru and en', () => {
    expect(registryLabel('fuel', 'ДИЗЕЛЬНЕ ПАЛИВО', 'en')).toBe('diesel')
    expect(registryLabel('fuel', 'ЕЛЕКТРО АБО БЕНЗИН', 'ru')).toBe('электро или бензин')
    expect(registryLabel('color', 'СІРИЙ', 'en')).toBe('grey')
    expect(registryLabel('body', 'УНІВЕРСАЛ', 'en')).toBe('estate')
  })

  it('keeps the Ukrainian word, lowercased, for ua and unknown languages', () => {
    expect(registryLabel('fuel', 'ДИЗЕЛЬНЕ ПАЛИВО', 'ua')).toBe('дизельне паливо')
    expect(registryLabel('body', 'СЕДАН', 'de')).toBe('седан')
  })

  it('drops the stray body variant suffix (Latin B, Cyrillic В, dash or space)', () => {
    for (const v of ['СЕДАН-B', 'СЕДАН-В', 'СЕДАН В', 'СЕДАН B']) expect(registryLabel('body', v, 'en')).toBe('sedan')
    expect(registryLabel('body', 'ХЕТЧБЕК-В', 'ua')).toBe('хетчбек')
  })

  it('falls back to the Ukrainian word for a value that is not in the table', () => {
    expect(registryLabel('color', 'ТЕМНО-ЗЕЛЕНИЙ', 'en')).toBe('темно-зелений')
  })
})

describe('localizeRegistryRows', () => {
  it('merges words that read the same after localizing and sorts by count', () => {
    const rows: [string, number][] = [
      ['СЕДАН-B', 831],
      ['УНІВЕРСАЛ', 646],
      ['СЕДАН', 574],
      ['УНІВЕРСАЛ-B', 353]
    ]
    expect(localizeRegistryRows('body', rows, 'en')).toEqual([
      ['sedan', 1405],
      ['estate', 999]
    ])
  })

  it('merges the unknown-fuel spellings', () => {
    expect(
      localizeRegistryRows(
        'fuel',
        [
          ['NULL', 5],
          ['.', 1],
          ['БЕНЗИН', 9]
        ],
        'en'
      )
    ).toEqual([
      ['petrol', 9],
      ['not specified', 6]
    ])
  })
})
