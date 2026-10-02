import type { Paragraph, Table } from 'docx'

import { fetchImageAsPng } from '@/lib/export-image'
import type { ExportReport, ExportSection } from '@/lib/export-report'

const HERO_MAX_WIDTH_PX = 480
const LOGO_MAX_WIDTH_PX = 96

// `docx` the *value* is only pulled into the bundle when a viewer actually asks for a Word
// download (dynamic import, same rationale as apps/web/src/lib/telemetry.ts) — the `import
// type` above is erased at compile time and never reaches the runtime bundle either way.
async function loadDocx(): Promise<typeof import('docx')> {
  return import('docx')
}

type Docx = Awaited<ReturnType<typeof loadDocx>>

function sectionToDocx(section: ExportSection, docx: Docx): (Paragraph | Table)[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ExternalHyperlink } = docx
  const heading = new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 })

  if (section.type === 'kv') {
    const rows = section.rows.map(
      row =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: row.label })]
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: row.value })]
            })
          ]
        })
    )
    return [heading, new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })]
  }

  if (section.type === 'text') {
    return [heading, ...section.paragraphs.map(p => new Paragraph({ text: p }))]
  }

  if (section.type === 'table') {
    const note = section.note ? [new Paragraph({ children: [new TextRun({ text: section.note, italics: true })] })] : []
    const header = new TableRow({
      children: section.columns.map(
        col => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })] })
      )
    })
    const rows = section.rows.map(
      row => new TableRow({ children: row.map(cell => new TableCell({ children: [new Paragraph({ text: cell })] })) })
    )
    return [heading, ...note, new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] })]
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
  const { Document, Paragraph, HeadingLevel, ImageRun, Packer } = docx

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
  const children: (Paragraph | Table)[] = []
  if (logo) children.push(logo)
  children.push(new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1 }))
  if (hero) children.push(hero)
  children.push(new Paragraph({ text: report.subtitle }), new Paragraph({ text: report.generatedAtLabel }))
  for (const section of report.sections) children.push(...sectionToDocx(section, docx))

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
