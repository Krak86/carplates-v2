import { describe, expect, it } from 'vitest'

import { hasImportOperation, isImportOperation } from './import-history.js'

describe('isImportOperation', () => {
  it('matches the import codes and the customs wording', () => {
    expect(isImportOperation({ operCode: 71 })).toBe(true)
    expect(
      isImportOperation({ operCode: 999, operName: 'РЕЄСТРАЦІЯ ТЗ ПРИВЕЗЕНОГО З-ЗА КОРДОНУ ПО ПОСВІДЧЕННЮ МИТНИЦІ' })
    ).toBe(true)
  })

  it('does not treat a new car brought in by a dealer as a used import', () => {
    expect(
      isImportOperation({
        operCode: null,
        operName: 'ПЕРВИННА РЕЄСТРАЦІЯ НОВОГО ТЗ ПРИДБАНОГО В ТОРГОВЕЛЬНІЙ ОРГАНІЗАЦІЇ, ЯКИЙ ВВЕЗЕНО З-ЗА КОРДОНУ'
      })
    ).toBe(false)
  })
})

describe('hasImportOperation', () => {
  it('finds an import that is not the last operation', () => {
    expect(hasImportOperation([{ operCode: 40 }, { operCode: 71 }])).toBe(true)
    expect(hasImportOperation([{ operCode: 40 }, { operCode: null, operName: 'ПРОДАЖ' }])).toBe(false)
  })
})
