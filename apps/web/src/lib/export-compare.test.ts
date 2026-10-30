import { describe, expect, it } from 'vitest'

import type { FormatContext } from '@/components/compare/format'
import type { CompareSection } from '@/components/compare/rows'
import type { CompareRow } from '@/components/compare/types'
import { buildCompareReport } from '@/lib/export-compare'

const t = (key: string, options?: Record<string, unknown>): string =>
  options ? `${key}${JSON.stringify(options)}` : key
const ctx: FormatContext = { locale: 'en', lang: 'en', t, regionLabel: n => n }

const row = (id: string, values: CompareRow['values'], extra: Partial<CompareRow> = {}): CompareRow => ({
  id,
  group: 'engine',
  labelKey: `row.${id}`,
  unitKey: 'unit.kw',
  values,
  valueKind: 'number',
  direction: 'higher',
  source: 'rdw',
  ...extra
})

const sections: CompareSection[] = [
  {
    group: 'engine',
    rows: [row('power', [100, 150]), row('cc', [1600, 1600], { direction: 'neutral' })],
    pending: false
  },
  { group: 'price', rows: [], pending: true }
]

const input = {
  names: ['A car', 'B car'] as const,
  sections,
  hidden: 2,
  url: '/compare?a=x&b=y',
  diffOnly: false,
  ctx
}

describe('buildCompareReport', () => {
  it('marks the better side and skips pending groups', () => {
    const report = buildCompareReport(input, t)
    const table = report.sections.find(s => s.type === 'table')
    expect(table?.type === 'table' && table.rows[0]).toEqual([
      'row.power',
      '100 unit.kw',
      '150 unit.kw (compare.better)'
    ])
    expect(report.sections.some(s => s.id === 'price')).toBe(false)
  })

  it('drops equal rows in differences-only mode and lists the sources', () => {
    const report = buildCompareReport({ ...input, diffOnly: true }, t)
    const table = report.sections.find(s => s.type === 'table')
    expect(table?.type === 'table' && table.rows).toHaveLength(1)
    const sources = report.sections.find(s => s.id === 'sources')
    expect(sources?.type === 'links' && sources.links.map(l => l.url)).toContain('https://opendata.rdw.nl')
  })
})
