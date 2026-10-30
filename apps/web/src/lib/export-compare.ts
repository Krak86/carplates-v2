import { betterSide, isSame } from '@/components/compare/rows'
import type { CompareSection } from '@/components/compare/rows'
import { formatWithUnit } from '@/components/compare/format'
import type { FormatContext } from '@/components/compare/format'
import type { CompareSource } from '@/components/compare/types'
import { buildHighlights } from '@/components/compare/visuals'
import { SOURCE } from '@/lib/export-news'
import type { ExportReport, ExportSection, Translate } from '@/lib/export-report'

const SOURCE_LINKS: Readonly<Record<CompareSource, readonly { label: string; url: string }[]>> = {
  registry: [SOURCE.registry],
  rdw: [SOURCE.rdw],
  wiki: [SOURCE.wiki],
  safety: [SOURCE.euroncap, SOURCE.nhtsa],
  mot: [SOURCE.mot],
  recalls: [SOURCE.rdw, SOURCE.nhtsa]
}

export type CompareReportInput = {
  /** Display names of car A and car B (already `Brand Model Year`). */
  names: readonly [string, string]
  /** Pruned groups; a group still `pending` is left out. */
  sections: readonly CompareSection[]
  /** Rows dropped because neither car has data. */
  hidden: number
  /** The shareable `/compare?...` address. */
  url: string
  diffOnly: boolean
  ctx: FormatContext
}

/** The compare page as an export: biggest differences, one table per group (the better side marked), the sources that contributed. */
export function buildCompareReport(input: CompareReportInput, t: Translate): ExportReport {
  const { names, ctx } = input
  const ready = input.sections.filter(s => !s.pending)
  const marker = ` (${t('compare.better')})`

  const sections: ExportSection[] = []

  const highlights = buildHighlights(ready.flatMap(s => s.rows))
  if (highlights.length > 0) {
    sections.push({
      type: 'text',
      id: 'highlights',
      title: t('compare.highlights.title'),
      paragraphs: highlights.map(
        h => `${names[h.side]} - ${t('compare.highlights.item', { label: t(h.row.labelKey), percent: h.percent })}`
      )
    })
  }

  for (const section of ready) {
    const rows = input.diffOnly ? section.rows.filter(r => !isSame(r)) : section.rows
    if (rows.length === 0) continue
    const scope = t(section.group === 'exact' ? 'compare.scope.exact' : 'compare.scope.model')
    sections.push({
      type: 'table',
      id: section.group,
      title: `${t(`compare.group.${section.group}`)} (${scope})`,
      columns: [t('compare.column.measure'), names[0], names[1]],
      rows: rows.map(row => {
        const better = betterSide(row)
        return [
          t(row.labelKey),
          formatWithUnit(row, row.values[0], ctx) + (better === 0 ? marker : ''),
          formatWithUnit(row, row.values[1], ctx) + (better === 1 ? marker : '')
        ]
      })
    })
  }

  const notes = [t('compare.footnote')]
  if (input.hidden > 0) notes.unshift(t('compare.hidden', { count: input.hidden }))
  sections.push({ type: 'text', id: 'notes', title: t('compare.export.notes'), paragraphs: notes })

  const used = new Map<string, { label: string; url: string }>()
  for (const source of new Set(ready.flatMap(s => s.rows.map(r => r.source)))) {
    for (const link of SOURCE_LINKS[source]) used.set(link.url, link)
  }
  sections.push({
    type: 'links',
    id: 'sources',
    title: t('export.sources'),
    links: [{ label: t('compare.title'), url: input.url }, ...used.values()]
  })

  return {
    title: `${names[0]} / ${names[1]}`,
    subtitle: t('compare.title'),
    logo: null,
    heroImage: null,
    generatedAtLabel: t('export.generatedAt', { date: new Date().toLocaleString() }),
    description: t('compare.export.description'),
    sections
  }
}
