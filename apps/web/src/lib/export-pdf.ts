import { fetchImageAsPng, renderChartPng } from '@/lib/export-image'
import type { EmbeddedImage } from '@/lib/export-image'
import type { ExportKeyValueSection, ExportReport, ExportSection, ExportTone } from '@/lib/export-report'

const LOGO_MAX_WIDTH_PT = 64
const LOGO_SOURCE_MAX_WIDTH_PX = 256
const HERO_MAX_WIDTH_PT = 320
const HERO_SOURCE_MAX_WIDTH_PX = 800
const CHART_WIDTH_PT = 400

// `jspdf` is only pulled into the bundle when a viewer actually asks for a PDF download
// (dynamic import, same rationale as apps/web/src/lib/telemetry.ts).
async function loadJsPdf(): Promise<typeof import('jspdf').jsPDF> {
  const { jsPDF } = await import('jspdf')
  return jsPDF
}

const FONT_NAME = 'NotoSans'
const FONT_FILES: Readonly<Record<'normal' | 'bold', string>> = {
  normal: '/fonts/NotoSans-Regular.ttf',
  bold: '/fonts/NotoSans-Bold.ttf'
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const CHUNK_SIZE = 0x8000 // String.fromCharCode(...bytes) on the whole array overflows the call stack for a font-sized buffer
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return btoa(binary)
}

/**
 * jsPDF's built-in fonts (helvetica/times/courier) only cover WinAnsi (Latin-1) — any Cyrillic
 * character silently renders as the wrong glyph instead of erroring, so every ua/ru export came
 * out as mojibake. Noto Sans (SIL OFL, apps/web/public/fonts/) covers Latin + Cyrillic +
 * Ukrainian-specific letters (і/є/ї) in one face — bundled as a static asset and only fetched
 * here, when a PDF is actually requested, never as part of the main bundle.
 */
async function registerFonts(doc: InstanceType<Awaited<ReturnType<typeof loadJsPdf>>>): Promise<void> {
  const [normal, bold] = await Promise.all([
    fetch(FONT_FILES.normal).then(r => r.arrayBuffer()),
    fetch(FONT_FILES.bold).then(r => r.arrayBuffer())
  ])
  doc.addFileToVFS('NotoSans-Regular.ttf', arrayBufferToBase64(normal))
  doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', arrayBufferToBase64(bold))
  doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold')
  doc.setFont(FONT_NAME, 'normal')
}

const PAGE_MARGIN = 40
const LINE_HEIGHT = 14
const FONT_SIZE_TITLE = 16
const FONT_SIZE_HEADING = 12
const FONT_SIZE_BODY = 9
const FONT_SIZE_SMALL = 8

const CELL_PAD = 5
const CELL_LINE_HEIGHT = 12
const NOTE_LINE_HEIGHT = 11
const KV_LABEL_SHARE = 0.3
const MIN_COLUMN_WIDTH_PT = 44
const MAX_COLUMN_WEIGHT = 30
const TIMELINE_INDENT = 30
const NODE_RADIUS = 8

type Rgb = [number, number, number]
type Row = ExportKeyValueSection['rows'][number]

const INK: Rgb = [15, 23, 42]
const MUTED: Rgb = [100, 116, 139]
const RULE: Rgb = [203, 213, 225]
const HEADER_FILL: Rgb = [226, 232, 240]
const ZEBRA_FILL: Rgb = [248, 250, 252]
const ACCENT: Rgb = [37, 99, 235]
const WHITE: Rgb = [255, 255, 255]

const TONE_STYLE: Readonly<Record<ExportTone, { fill: Rgb; text: Rgb }>> = {
  alert: { fill: [254, 226, 226], text: [153, 27, 27] },
  ok: { fill: [220, 252, 231], text: [22, 101, 52] },
  neutral: { fill: [241, 245, 249], text: [51, 65, 85] }
}

/** Column widths from the longest text in each column (capped, so one long cell cannot starve the rest). */
function columnWidths(columns: string[], rows: string[][], totalWidth: number): number[] {
  const weights = columns.map((col, i) =>
    Math.min(MAX_COLUMN_WEIGHT, Math.max(4, col.length, ...rows.map(row => (row[i] ?? '').length)))
  )
  const sum = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map(w => Math.max(MIN_COLUMN_WIDTH_PT, (w / sum) * totalWidth))
  const scale = totalWidth / widths.reduce((a, b) => a + b, 0)
  return widths.map(w => w * scale)
}

function noteText(row: Row): string {
  return row.label === '-' ? row.value : `${row.label}: ${row.value}`
}

/**
 * jsPDF alone (no jspdf-autotable, which would be a second heavy dependency for a rarely-used
 * export path) has no table layout, so the few pieces below are drawn by hand: a shaded header row,
 * zebra rows, a fixed label column for key/value tables, rows that never split across pages
 * (the header repeats on the next page), a verdict banner, a stepped timeline and the cover strip.
 */
export async function toPdfBlob(report: ExportReport): Promise<Blob> {
  const JsPdfCtor = await loadJsPdf()
  const doc = new JsPdfCtor({ unit: 'pt', format: 'a4' })
  await registerFonts(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - PAGE_MARGIN * 2
  let y = PAGE_MARGIN

  function ensureSpace(next: number): void {
    if (y + next > pageHeight - PAGE_MARGIN) {
      doc.addPage()
      y = PAGE_MARGIN
    }
  }

  function splitText(text: string, width: number, fontSize: number, bold: boolean): string[] {
    doc.setFontSize(fontSize)
    doc.setFont(FONT_NAME, bold ? 'bold' : 'normal')
    return doc.splitTextToSize(text, width)
  }

  function writeLines(text: string, fontSize: number, bold: boolean, color: Rgb = INK): void {
    doc.setTextColor(...color)
    for (const line of splitText(text, maxWidth, fontSize, bold)) {
      ensureSpace(LINE_HEIGHT)
      doc.text(line, PAGE_MARGIN, y)
      y += LINE_HEIGHT
    }
  }

  function writeImage(image: EmbeddedImage | null, widthPt: number): void {
    if (!image) return
    const width = Math.min(maxWidth, widthPt)
    const height = (image.height / image.width) * width
    ensureSpace(height)
    doc.addImage(image.data, 'PNG', PAGE_MARGIN, y, width, height)
    y += height + LINE_HEIGHT / 2
  }

  /** Rounded pills in one flowing row: the cover's verdict / region / year / fuel strip. */
  function writeSummaryStrip(items: NonNullable<ExportReport['summary']>): void {
    const PILL_HEIGHT = 18
    const PILL_GAP = 6
    let x = PAGE_MARGIN
    ensureSpace(PILL_HEIGHT)
    for (const item of items) {
      const style = TONE_STYLE[item.tone ?? 'neutral']
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setFont(FONT_NAME, 'bold')
      const width = doc.getTextWidth(item.text) + 16
      if (x > PAGE_MARGIN && x + width > PAGE_MARGIN + maxWidth) {
        x = PAGE_MARGIN
        y += PILL_HEIGHT + PILL_GAP
        ensureSpace(PILL_HEIGHT)
      }
      doc.setFillColor(...style.fill)
      doc.roundedRect(x, y, width, PILL_HEIGHT, 9, 9, 'F')
      doc.setTextColor(...style.text)
      doc.text(item.text, x + 8, y + 12.5)
      x += width + PILL_GAP
    }
    y += PILL_HEIGHT + PILL_GAP
  }

  function writeHeading(title: string): void {
    ensureSpace(LINE_HEIGHT * 4) // a heading never ends a page on its own
    y += 4
    writeLines(title, FONT_SIZE_HEADING, true)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.75)
    doc.line(PAGE_MARGIN, y - LINE_HEIGHT + 4, PAGE_MARGIN + maxWidth, y - LINE_HEIGHT + 4)
    y += 4
  }

  /** The verdict row as a coloured box with an accent bar on the left. */
  function writeBanner(label: string, value: string, tone: ExportTone): void {
    const PAD = 10
    const style = TONE_STYLE[tone]
    const lines = splitText(value, maxWidth - PAD * 2 - 4, 12, true)
    const height = PAD * 2 + FONT_SIZE_SMALL + 4 + lines.length * 16
    ensureSpace(height)
    doc.setFillColor(...style.fill)
    doc.roundedRect(PAGE_MARGIN, y, maxWidth, height, 4, 4, 'F')
    doc.setFillColor(...style.text)
    doc.rect(PAGE_MARGIN, y, 4, height, 'F')

    const x = PAGE_MARGIN + 4 + PAD
    doc.setTextColor(...style.text)
    doc.setFontSize(FONT_SIZE_SMALL)
    doc.setFont(FONT_NAME, 'normal')
    doc.text(label.toUpperCase(), x, y + PAD + FONT_SIZE_SMALL)
    doc.setFontSize(12)
    doc.setFont(FONT_NAME, 'bold')
    lines.forEach((line, i) => doc.text(line, x, y + PAD + FONT_SIZE_SMALL + 4 + 12 + i * 16))
    y += height + 6
  }

  /**
   * A ruled table. Every row is measured first and kept whole: a row that does not fit moves to the
   * next page, where the header row (when there is one) is drawn again.
   */
  function writeTable(columns: string[] | null, rows: string[][], widths: number[], boldFirstColumn: boolean): void {
    const xs = widths.map((_, i) => PAGE_MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0))

    function drawRow(cells: string[], fill: Rgb | null, isHeader: boolean): void {
      const bold = (col: number): boolean => isHeader || (boldFirstColumn && col === 0)
      const wrapped = cells.map((cell, i) => splitText(cell || '-', widths[i]! - CELL_PAD * 2, FONT_SIZE_BODY, bold(i)))
      const height = Math.max(...wrapped.map(lines => lines.length)) * CELL_LINE_HEIGHT + CELL_PAD * 2 - 2
      if (y + height > pageHeight - PAGE_MARGIN) {
        doc.addPage()
        y = PAGE_MARGIN
        if (columns && !isHeader) drawRow(columns, HEADER_FILL, true)
      }
      if (fill) {
        doc.setFillColor(...fill)
        doc.rect(PAGE_MARGIN, y, maxWidth, height, 'F')
      }
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setTextColor(...INK)
      wrapped.forEach((lines, i) => {
        doc.setFont(FONT_NAME, bold(i) ? 'bold' : 'normal')
        lines.forEach((line, n) =>
          doc.text(line, xs[i]! + CELL_PAD, y + CELL_PAD + FONT_SIZE_BODY - 1 + n * CELL_LINE_HEIGHT)
        )
      })
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.5)
      doc.line(PAGE_MARGIN, y + height, PAGE_MARGIN + maxWidth, y + height)
      y += height
    }

    if (columns) {
      // The header never sits alone at the bottom of a page: keep it with the first row.
      ensureSpace(CELL_LINE_HEIGHT * 2 + CELL_PAD * 4)
      drawRow(columns, HEADER_FILL, true)
    }
    rows.forEach((row, i) => drawRow(row, i % 2 === 1 ? ZEBRA_FILL : null, false))
    y += LINE_HEIGHT / 2
  }

  /** Numbered steps joined by a vertical line; `note` rows hang small and grey under the step above. */
  function writeTimeline(rows: Row[]): void {
    const steps: { row: Row; notes: Row[] }[] = []
    const trailing: Row[] = []
    for (const row of rows) {
      const last = steps[steps.length - 1]
      if (!row.note) steps.push({ row, notes: [] })
      else if (last) last.notes.push(row)
      else trailing.push(row)
    }

    const textWidth = maxWidth - TIMELINE_INDENT
    steps.forEach(({ row, notes }, index) => {
      const valueLines = splitText(row.value, textWidth, FONT_SIZE_BODY, false)
      const noteLines = notes.map(n => splitText(noteText(n), textWidth, FONT_SIZE_SMALL, false))
      const height =
        LINE_HEIGHT +
        valueLines.length * CELL_LINE_HEIGHT +
        noteLines.reduce((sum, lines) => sum + lines.length * NOTE_LINE_HEIGHT, 0) +
        14
      ensureSpace(height)

      const cx = PAGE_MARGIN + NODE_RADIUS
      const cy = y + NODE_RADIUS - 1
      if (index < steps.length - 1) {
        doc.setDrawColor(...RULE)
        doc.setLineWidth(1.5)
        doc.line(cx, cy + NODE_RADIUS, cx, cy + height - NODE_RADIUS)
      }
      doc.setFillColor(...ACCENT)
      doc.circle(cx, cy, NODE_RADIUS, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setFont(FONT_NAME, 'bold')
      doc.text(String(index + 1), cx, cy + 3, { align: 'center' })

      const x = PAGE_MARGIN + TIMELINE_INDENT
      doc.setTextColor(...INK)
      doc.setFontSize(FONT_SIZE_BODY + 1)
      doc.text(row.label, x, y + 8)
      let ty = y + 8 + CELL_LINE_HEIGHT
      doc.setFontSize(FONT_SIZE_BODY)
      doc.setFont(FONT_NAME, 'normal')
      for (const line of valueLines) {
        doc.text(line, x, ty)
        ty += CELL_LINE_HEIGHT
      }
      doc.setTextColor(...MUTED)
      doc.setFontSize(FONT_SIZE_SMALL)
      for (const lines of noteLines) {
        for (const line of lines) {
          doc.text(line, x, ty)
          ty += NOTE_LINE_HEIGHT
        }
      }
      y += height
    })

    for (const row of trailing) writeLines(noteText(row), FONT_SIZE_SMALL, false, MUTED)
  }

  function writeKeyValue(section: ExportKeyValueSection): void {
    if (section.layout === 'timeline') {
      writeTimeline(section.rows)
      return
    }

    let rows = section.rows
    const first = rows[0]
    if (section.tone && first) {
      writeBanner(first.label, first.value, section.tone)
      rows = rows.slice(1)
    }
    if (rows.length === 0) return
    const labelWidth = maxWidth * KV_LABEL_SHARE
    writeTable(
      null,
      rows.map(row => [row.label, row.value]),
      [labelWidth, maxWidth - labelWidth],
      true
    )
  }

  const [logo, hero] = await Promise.all([
    report.logo ? fetchImageAsPng(report.logo.url, LOGO_SOURCE_MAX_WIDTH_PX) : null,
    report.heroImage ? fetchImageAsPng(report.heroImage.url, HERO_SOURCE_MAX_WIDTH_PX) : null
  ])
  writeImage(logo, LOGO_MAX_WIDTH_PT)
  writeLines(report.title, FONT_SIZE_TITLE, true)
  writeLines(report.subtitle, FONT_SIZE_BODY, false, MUTED)
  y += 4
  if (report.summary && report.summary.length > 0) writeSummaryStrip(report.summary)
  // With a contents page the hero moves to the first section's page, so page 1 is title + description + contents.
  const hasToc = !!report.contentsLabel && report.sections.length > 1
  if (!hasToc) writeImage(hero, HERO_MAX_WIDTH_PT)
  writeLines(report.generatedAtLabel, FONT_SIZE_SMALL, false, MUTED)
  y += LINE_HEIGHT / 2
  if (report.description) {
    y += 4
    writeLines(report.description, FONT_SIZE_BODY, false)
  }
  let tocY = y
  const sectionPages: number[] = []
  if (hasToc) {
    y += LINE_HEIGHT
    writeHeading(report.contentsLabel!)
    tocY = y
  }

  function writeSection(section: ExportSection, index: number): void {
    // The first section shares the cover page unless there is a contents page.
    if (index > 0 || hasToc) {
      doc.addPage()
      y = PAGE_MARGIN
    }
    sectionPages.push(doc.getNumberOfPages())
    if (index === 0 && hasToc) writeImage(hero, HERO_MAX_WIDTH_PT)
    writeHeading(section.title)

    if (section.type === 'kv') {
      writeKeyValue(section)
    } else if (section.type === 'text') {
      for (const p of section.paragraphs) writeLines(p, FONT_SIZE_BODY, false)
    } else if (section.type === 'table' || section.type === 'chart') {
      if (section.type === 'chart') writeImage(renderChartPng(section), CHART_WIDTH_PT)
      if (section.note) writeLines(section.note, FONT_SIZE_BODY, false, MUTED)
      writeTable(section.columns, section.rows, columnWidths(section.columns, section.rows, maxWidth), false)
    } else {
      for (const link of section.links) writeLines(`${link.label}: ${link.url}`, FONT_SIZE_BODY, false)
    }
    y += LINE_HEIGHT / 2
  }

  report.sections.forEach((section, i) => writeSection(section, i))

  if (hasToc) {
    // Page numbers are only known now, so the entries are drawn back on page 1; each one links to its section page.
    doc.setPage(1)
    const lineHeight = Math.min(18, (pageHeight - PAGE_MARGIN - tocY) / report.sections.length)
    const fontSize = lineHeight < 14 ? FONT_SIZE_SMALL : FONT_SIZE_BODY + 1
    doc.setFontSize(fontSize)
    doc.setFont(FONT_NAME, 'normal')
    report.sections.forEach((section, i) => {
      const page = sectionPages[i]!
      const baseline = tocY + i * lineHeight + fontSize
      const pageLabel = String(page)
      const number = `${i + 1}.`
      const title = doc.splitTextToSize(section.title, maxWidth - 60)[0] as string
      doc.setTextColor(...MUTED)
      doc.text(number, PAGE_MARGIN, baseline)
      doc.setTextColor(...ACCENT)
      doc.text(title, PAGE_MARGIN + 24, baseline)
      doc.setTextColor(...MUTED)
      doc.text(pageLabel, PAGE_MARGIN + maxWidth, baseline, { align: 'right' })
      doc.link(PAGE_MARGIN, baseline - fontSize, maxWidth, lineHeight, { pageNumber: page })
    })
  }

  return doc.output('blob')
}
