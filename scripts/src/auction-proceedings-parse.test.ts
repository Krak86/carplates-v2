import { describe, expect, it } from 'vitest'

import { proceedingOfLine, splitDebtorLine, toProceedingInsert } from './auction-proceedings-parse.js'

const LINE =
  '"ІВАНЕНКО ІВАН ІВАНОВИЧ","01.01.1995","","Господарський суд м. Києва","Печерський ВДВС ""Київ""","(044) 111-22-33","Петренко П. П.","0501112233","a@b.gov.ua","71795326","конфіскація у справі про порушення митних правил"'

describe('auction proceedings parser', () => {
  it('splits quoted fields and keeps escaped quotes', () => {
    const c = splitDebtorLine(LINE)
    expect(c).toHaveLength(11)
    expect(c?.[4]).toBe('Печерський ВДВС "Київ"')
  })

  it('returns only the category, issuer and office, never a person', () => {
    const row = toProceedingInsert(LINE)
    expect(row).toEqual({
      proceedingNo: '71795326',
      category: 'конфіскація у справі про порушення митних правил',
      issuer: 'Господарський суд м. Києва',
      bailiffOffice: 'Печерський ВДВС "Київ"'
    })
    expect(JSON.stringify(row)).not.toMatch(/ІВАНЕНКО|1995|Петренко|0501112233|a@b/)
  })

  it('rejects a line with the wrong column count or without a proceeding number', () => {
    expect(toProceedingInsert('"a","b"')).toBeNull()
    expect(toProceedingInsert(LINE.replace('"71795326"', '""'))).toBeNull()
  })

  it('reads the proceeding number off the raw line end without parsing it', () => {
    expect(proceedingOfLine(LINE)).toBe('71795326')
    expect(proceedingOfLine('DEBTOR_NAME;DEBTOR_BIRTHDATE')).toBeNull()
  })

  it('treats an empty category as null', () => {
    expect(toProceedingInsert(LINE.replace(/"конфіскація[^"]*"$/, '""'))?.category).toBeNull()
  })
})
