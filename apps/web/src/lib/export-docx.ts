import type { Paragraph, Table } from 'docx'

import { fetchImageAsPng, renderChartPng } from '@/lib/export-image'
import type { ExportKeyValueSection, ExportReport, ExportSection, ExportTone } from '@/lib/export-report'

const HERO_MAX_WIDTH_PX = 480
const LOGO_MAX_WIDTH_PX = 96

// A4 with Word's default 2.54 cm margins leaves 9026 twips; fixed column widths must add up to it.
const TABLE_WIDTH_DXA = 9026
const KV_LABEL_DXA = 2708 // 30%
const STEP_NUMBER_DXA = 600

const INK = '0F172A'
const MUTED = '64748B'
const RULE = 'CBD5E1'
const HEADER_FILL = 'E2E8F0'
const ZEBRA_FILL = 'F8FAFC'
const ACCENT = '2563EB'

const TONE_STYLE: Readonly<Record<ExportTone, { fill: string; text: string }>> = {
  alert: { fill: 'FEE2E2', text: '991B1B' },
  ok: { fill: 'DCFCE7', text: '166534' },
  neutral: { fill: 'F1F5F9', text: '334155' }
}

// `docx` the *value* is only pulled into the bundle when a viewer actually asks for a Word
// download (dynamic import, same rationale as apps/web/src/lib/telemetry.ts) — the `import
// type` above is erased at compile time and never reaches the runtime bundle either way.
async function loadDocx(): Promise<typeof import('docx')> {
  return import('docx')
}

type Docx = Awaited<ReturnType<typeof loadDocx>>
type Row = ExportKeyValueSection['rows'][number]

/** Column widths (twips) from the longest text in each column, capped so one long cell cannot starve the rest. */
function columnWidthsDxa(columns: string[], rows: string[][]): number[] {
  const weights = columns.map((col, i) =>
    Math.min(30, Math.max(4, col.length, ...rows.map(row => (row[i] ?? '').length)))
  )
  const sum = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map(w => Math.max(900, Math.round((w / sum) * TABLE_WIDTH_DXA)))
  const scale = TABLE_WIDTH_DXA / widths.reduce((a, b) => a + b, 0)
  return widths.map(w => Math.floor(w * scale))
}

function noteText(row: Row): string {
  return row.label === '-' ? row.value : `${row.label}: ${row.value}`
}

function sectionToDocx(section: ExportSection, docx: Docx): (Paragraph | Table)[] {
  const {
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    TableLayoutType,
    BorderStyle,
    ExternalHyperlink,
    ImageRun
  } = docx
  const heading = new Paragraph({
    text: section.title,
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 2 } }
  })
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const hairline = { style: BorderStyle.SINGLE, size: 4, color: RULE }
  const gridBorders = { top: none, left: none, right: none, bottom: hairline }
  const fillOf = (fill: string): { type: typeof ShadingType.CLEAR; fill: string; color: string } => ({
    type: ShadingType.CLEAR,
    fill,
    color: 'auto'
  })
  const spacer = new Paragraph({ spacing: { after: 80 } })

  /** A ruled table: shaded header, zebra rows, fixed columns, rows that stay in one piece. */
  const ruledTable = (
    columns: string[] | null,
    rows: string[][],
    widths: number[],
    boldFirstColumn: boolean
  ): Table => {
    const cell = (text: string, col: number, fill: string | null, bold: boolean): InstanceType<typeof TableCell> =>
      new TableCell({
        width: { size: widths[col]!, type: WidthType.DXA },
        borders: gridBorders,
        shading: fill ? fillOf(fill) : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: text || '-', bold, size: 18, color: INK })] })]
      })
    const header = columns
      ? [
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: columns.map((col, i) => cell(col, i, HEADER_FILL, true))
          })
        ]
      : []
    const body = rows.map(
      (row, r) =>
        new TableRow({
          cantSplit: true,
          children: row.map((text, i) => cell(text, i, r % 2 === 1 ? ZEBRA_FILL : null, boldFirstColumn && i === 0))
        })
    )
    return new Table({
      width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      rows: [...header, ...body]
    })
  }

  /** The verdict row as a one-cell coloured box with a thick accent edge. */
  const banner = (row: Row, tone: ExportTone): Table => {
    const style = TONE_STYLE[tone]
    return new Table({
      width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [TABLE_WIDTH_DXA],
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
              shading: fillOf(style.fill),
              borders: {
                top: none,
                right: none,
                bottom: none,
                left: { style: BorderStyle.SINGLE, size: 36, color: style.text }
              },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: row.label.toUpperCase(), size: 16, color: style.text })]
                }),
                new Paragraph({
                  children: [new TextRun({ text: row.value, bold: true, size: 26, color: style.text })]
                })
              ]
            })
          ]
        })
      ]
    })
  }

  /** Numbered steps: a blue number cell beside the label / value / small grey notes. */
  const timeline = (rows: Row[]): Table => {
    const steps: { row: Row; notes: Row[] }[] = []
    for (const row of rows) {
      const last = steps[steps.length - 1]
      if (!row.note || !last) steps.push({ row, notes: [] })
      else last.notes.push(row)
    }
    const textDxa = TABLE_WIDTH_DXA - STEP_NUMBER_DXA
    return new Table({
      width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [STEP_NUMBER_DXA, textDxa],
      rows: steps.map(
        ({ row, notes }, index) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: STEP_NUMBER_DXA, type: WidthType.DXA },
                shading: fillOf(ACCENT),
                borders: {
                  top: none,
                  left: none,
                  right: none,
                  bottom: { style: BorderStyle.SINGLE, size: 12, color: 'FFFFFF' }
                },
                verticalAlign: docx.VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [new TextRun({ text: String(index + 1), bold: true, size: 22, color: 'FFFFFF' })]
                  })
                ]
              }),
              new TableCell({
                width: { size: textDxa, type: WidthType.DXA },
                borders: gridBorders,
                margins: { top: 80, bottom: 80, left: 160, right: 100 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: row.label, bold: true, size: 20, color: INK })] }),
                  new Paragraph({ children: [new TextRun({ text: row.value, size: 18, color: INK })] }),
                  ...notes.map(
                    n => new Paragraph({ children: [new TextRun({ text: noteText(n), size: 16, color: MUTED })] })
                  )
                ]
              })
            ]
          })
      )
    })
  }

  if (section.type === 'kv') {
    if (section.layout === 'timeline') return [heading, timeline(section.rows), spacer]

    const first = section.rows[0]
    const hasBanner = !!section.tone && !!first
    const rows = hasBanner ? section.rows.slice(1) : section.rows
    return [
      heading,
      ...(hasBanner ? [banner(first, section.tone!), spacer] : []),
      ...(rows.length > 0
        ? [
            ruledTable(
              null,
              rows.map(row => [row.label, row.value]),
              [KV_LABEL_DXA, TABLE_WIDTH_DXA - KV_LABEL_DXA],
              true
            ),
            spacer
          ]
        : [])
    ]
  }

  if (section.type === 'text') {
    return [heading, ...section.paragraphs.map(p => new Paragraph({ text: p }))]
  }

  if (section.type === 'table' || section.type === 'chart') {
    const picture = section.type === 'chart' ? renderChartPng(section) : null
    const chart = picture
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: picture.data,
                transformation: { width: picture.width, height: picture.height },
                altText: { title: section.title, description: section.title, name: section.title }
              })
            ]
          })
        ]
      : []
    const note = section.note ? [new Paragraph({ children: [new TextRun({ text: section.note, italics: true })] })] : []
    return [
      heading,
      ...chart,
      ...note,
      ruledTable(section.columns, section.rows, columnWidthsDxa(section.columns, section.rows), false),
      spacer
    ]
  }

  // links
  return [
    heading,
    ...section.links.map(
      link =>
        new Paragraph({
          children: [
            new ExternalHyperlink({ link: link.url, children: [new TextRun({ text: link.label, style: 'Hyperlink' })] })
          ]
        })
    )
  ]
}

export async function toDocxBlob(report: ExportReport): Promise<Blob> {
  const docx = await loadDocx()
  const { Document, Paragraph, TextRun, HeadingLevel, ImageRun, Packer, ShadingType } = docx

  const imageParagraph = async (image: ExportReport['logo'], maxWidth: number): Promise<Paragraph | null> => {
    const png = image ? await fetchImageAsPng(image.url, maxWidth) : null
    if (!image || !png) return null
    return new Paragraph({
      children: [
        new ImageRun({
          type: 'png',
          data: png.data,
          transformation: { width: png.width, height: png.height },
          altText: { title: image.alt, description: image.alt, name: image.alt }
        })
      ]
    })
  }

  const [logo, hero] = await Promise.all([
    imageParagraph(report.logo, LOGO_MAX_WIDTH_PX),
    imageParagraph(report.heroImage, HERO_MAX_WIDTH_PX)
  ])

  // The cover strip: one shaded run per item (verdict first), separated by plain spaces.
  const strip = (report.summary ?? []).flatMap(item => {
    const style = TONE_STYLE[item.tone ?? 'neutral']
    return [
      new TextRun({
        text: ` ${item.text} `,
        bold: true,
        color: style.text,
        shading: { type: ShadingType.CLEAR, fill: style.fill, color: 'auto' }
      }),
      new TextRun({ text: '  ' })
    ]
  })

  const children: (Paragraph | Table)[] = []
  if (logo) children.push(logo)
  children.push(
    new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: report.subtitle, color: MUTED })] })
  )
  if (strip.length > 0) children.push(new Paragraph({ children: strip, spacing: { before: 120, after: 120 } }))
  if (hero) children.push(hero)
  children.push(new Paragraph({ children: [new TextRun({ text: report.generatedAtLabel, size: 16, color: MUTED })] }))
  for (const section of report.sections) children.push(...sectionToDocx(section, docx))

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
