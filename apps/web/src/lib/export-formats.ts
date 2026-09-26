import type { ExportReport, ExportSection } from '@/lib/export-report'

function sectionToTextLines(section: ExportSection): string[] {
  const lines: string[] = [`## ${section.title}`]
  if (section.type === 'kv') {
    for (const row of section.rows) lines.push(`${row.label}: ${row.value}`)
  } else if (section.type === 'text') {
    lines.push(...section.paragraphs)
  } else if (section.type === 'table') {
    if (section.note) lines.push(section.note, '')
    lines.push(section.columns.join(' | '))
    for (const row of section.rows) lines.push(row.join(' | '))
  } else {
    for (const link of section.links) lines.push(`${link.label}: ${link.url}`)
  }
  return lines
}

/** Plain text — used for both the clipboard copy and the .txt download. */
export function toPlainText(report: ExportReport): string {
  const lines = [report.title, report.subtitle, report.generatedAtLabel, '']
  for (const section of report.sections) lines.push(...sectionToTextLines(section), '')
  return lines.join('\n').trim() + '\n'
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

function sectionToMarkdown(section: ExportSection): string[] {
  const lines: string[] = [`## ${section.title}`, '']
  if (section.type === 'kv') {
    lines.push('| Field | Value |', '| --- | --- |')
    for (const row of section.rows) lines.push(`| ${escapeMd(row.label)} | ${escapeMd(row.value)} |`)
  } else if (section.type === 'text') {
    for (const p of section.paragraphs) lines.push(p, '')
  } else if (section.type === 'table') {
    if (section.note) lines.push(`_${section.note}_`, '')
    lines.push(`| ${section.columns.map(escapeMd).join(' | ')} |`)
    lines.push(`| ${section.columns.map(() => '---').join(' | ')} |`)
    for (const row of section.rows) lines.push(`| ${row.map(escapeMd).join(' | ')} |`)
  } else {
    for (const link of section.links) lines.push(`- [${link.label}](${link.url})`)
  }
  return lines
}

export function toMarkdown(report: ExportReport): string {
  const lines = [`# ${report.title}`, '', `*${report.subtitle}*`, '', `*${report.generatedAtLabel}*`, '']
  for (const section of report.sections) lines.push(...sectionToMarkdown(section), '')
  return lines.join('\n').trim() + '\n'
}

/** RFC 4180 field escaping — wraps in quotes whenever the field carries a comma, quote, or newline. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function csvLine(values: string[]): string {
  return values.map(csvField).join(',')
}

function sectionToCsvBlock(section: ExportSection): string[] {
  const lines: string[] = [csvLine([`# ${section.title}`])]
  if (section.type === 'kv') {
    lines.push(csvLine(['Field', 'Value']))
    for (const row of section.rows) lines.push(csvLine([row.label, row.value]))
  } else if (section.type === 'text') {
    for (const p of section.paragraphs) lines.push(csvLine([p]))
  } else if (section.type === 'table') {
    if (section.note) lines.push(csvLine([section.note]))
    lines.push(csvLine(section.columns))
    for (const row of section.rows) lines.push(csvLine(row))
  } else {
    lines.push(csvLine(['Label', 'URL']))
    for (const link of section.links) lines.push(csvLine([link.label, link.url]))
  }
  return lines
}

/**
 * A single CSV file, but the underlying report is hierarchical (several differently-shaped
 * tables), not one flat table — so this concatenates one mini CSV block per section, each
 * headed by a `# <title>` comment line, separated by a blank line. Opens fine in any
 * spreadsheet app; a strict single-table CSV consumer would need to split it back up.
 *
 * Leads with a UTF-8 BOM — without it, Excel's CSV import guesses the system's legacy codepage
 * instead of UTF-8 and every Cyrillic label comes out as mojibake (a well-known Excel quirk;
 * it has no such problem with UTF-8 itself, only with detecting it). The BOM is added last,
 * after `.trim()` — `trim()` treats U+FEFF as whitespace and would otherwise strip it right back off.
 */
export function toCsv(report: ExportReport): string {
  const lines = [csvLine([report.title]), csvLine([report.subtitle]), csvLine([report.generatedAtLabel]), '']
  for (const section of report.sections) lines.push(...sectionToCsvBlock(section), '')
  return '﻿' + lines.join('\r\n').trim() + '\r\n'
}
