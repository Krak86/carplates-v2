import { describe, it, expect } from 'vitest'

import { caHeading, joinCaText, splitCaText } from './caRecalls.js'

const TEXT = 'Issue:\nA fault.\nIt is bad.\n\nSafety Risk:\nA crash.\n\nCorrective Actions:\nVisit a dealer.'

describe('splitCaText', () => {
  it('splits on headings and flattens line breaks inside a section', () => {
    expect(splitCaText(TEXT)).toEqual([
      { label: 'Issue', body: 'A fault. It is bad.' },
      { label: 'Safety Risk', body: 'A crash.' },
      { label: 'Corrective Actions', body: 'Visit a dealer.' }
    ])
  })

  it('keeps a text without headings as one unlabelled section', () => {
    expect(splitCaText('Just a note.')).toEqual([{ label: null, body: 'Just a note.' }])
  })
})

describe('joinCaText', () => {
  it('localizes the headings and keeps the layout', () => {
    expect(joinCaText(splitCaText(TEXT), 'uk')).toBe(
      'Проблема:\nA fault. It is bad.\n\nРизик для безпеки:\nA crash.\n\nКоригувальні дії:\nVisit a dealer.'
    )
  })
})

describe('caHeading', () => {
  it('maps wording variants and leaves unknown headings alone', () => {
    expect(caHeading('Safety risk', 'ru')).toBe('Риск для безопасности')
    expect(caHeading('Corrective measures', 'uk')).toBe('Коригувальні дії')
    expect(caHeading('Something else', 'uk')).toBe('Something else')
  })
})
