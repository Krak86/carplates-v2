import { describe, expect, it } from 'vitest'

import { toCsv, toMarkdown, toPlainText } from '@/lib/export-formats'
import type { ExportReport } from '@/lib/export-report'

const report: ExportReport = {
  title: 'TOYOTA CAMRY (2020)',
  subtitle: 'АА1234АА · JT123456789012345',
  generatedAtLabel: 'Generated: 2026-01-01',
  sections: [
    { type: 'kv', id: 'vehicle', title: 'Vehicle', rows: [{ label: 'VIN', value: 'JT123456789012345' }] },
    { type: 'text', id: 'coverage', title: 'Coverage', paragraphs: ['Line one.', 'Line two.'] },
    {
      type: 'table',
      id: 'euroncap',
      title: 'Euro NCAP',
      note: 'What the columns mean.',
      columns: ['Variant', 'Stars'],
      rows: [['Camry 2.5', '5']]
    },
    { type: 'links', id: 'images', title: 'All images', links: [{ label: 'Photo 1', url: 'https://example.com/1.jpg' }] }
  ]
}

describe('toPlainText', () => {
  it('renders every section as headed plain-text blocks', () => {
    const text = toPlainText(report)
    expect(text).toContain('TOYOTA CAMRY (2020)')
    expect(text).toContain('## Vehicle')
    expect(text).toContain('VIN: JT123456789012345')
    expect(text).toContain('## Coverage')
    expect(text).toContain('Line one.')
    expect(text).toContain('What the columns mean.')
    expect(text).toContain('Variant | Stars')
    expect(text).toContain('Camry 2.5 | 5')
    expect(text).toContain('Photo 1: https://example.com/1.jpg')
  })
})

describe('toMarkdown', () => {
  it('renders kv/table sections as markdown tables and links as a list', () => {
    const md = toMarkdown(report)
    expect(md).toContain('# TOYOTA CAMRY (2020)')
    expect(md).toContain('| Field | Value |')
    expect(md).toContain('| VIN | JT123456789012345 |')
    expect(md).toContain('| Variant | Stars |')
    expect(md).toContain('| Camry 2.5 | 5 |')
    expect(md).toContain('- [Photo 1](https://example.com/1.jpg)')
  })

  it('escapes a pipe character in a cell so it cannot break the table grid', () => {
    const withPipe: ExportReport = {
      ...report,
      sections: [{ type: 'kv', id: 'x', title: 'X', rows: [{ label: 'A | B', value: 'C' }] }]
    }
    expect(toMarkdown(withPipe)).toContain('A \\| B')
  })
})

describe('toCsv', () => {
  it('leads with a UTF-8 BOM so Excel does not mis-detect the encoding and garble Cyrillic text', () => {
    expect(toCsv(report).charCodeAt(0)).toBe(0xfeff)
  })

  it('concatenates one comment-headed CSV block per section', () => {
    const csv = toCsv(report)
    expect(csv).toContain('# Vehicle')
    expect(csv).toContain('Field,Value')
    expect(csv).toContain('VIN,JT123456789012345')
    expect(csv).toContain('Variant,Stars')
    expect(csv).toContain('Camry 2.5,5')
  })

  it('quotes a field that contains a comma or a quote, doubling embedded quotes', () => {
    const withComma: ExportReport = {
      ...report,
      sections: [{ type: 'kv', id: 'x', title: 'X', rows: [{ label: 'Note', value: 'has, a comma and a "quote"' }] }]
    }
    expect(toCsv(withComma)).toContain('"has, a comma and a ""quote"""')
  })
})
