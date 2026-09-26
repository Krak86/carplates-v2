import type { ExportReport, ExportSection } from '@/lib/export-report'

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

/**
 * jsPDF alone (no jspdf-autotable, which would be a second heavy dependency for a rarely-used
 * export path) has no real table layout — every row here is rendered as wrapped plain text
 * (`Column: value` pairs joined by " · "), not a ruled grid. Good enough for a "here's
 * everything, go look it up" export; a spreadsheet-shaped read belongs in the CSV download.
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

  function writeLines(text: string, fontSize: number, bold: boolean): void {
    doc.setFontSize(fontSize)
    doc.setFont(FONT_NAME, bold ? 'bold' : 'normal')
    const lines: string[] = doc.splitTextToSize(text, maxWidth)
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT)
      doc.text(line, PAGE_MARGIN, y)
      y += LINE_HEIGHT
    }
  }

  writeLines(report.title, FONT_SIZE_TITLE, true)
  writeLines(report.subtitle, FONT_SIZE_BODY, false)
  writeLines(report.generatedAtLabel, FONT_SIZE_BODY, false)
  y += LINE_HEIGHT / 2

  function writeSection(section: ExportSection): void {
    ensureSpace(LINE_HEIGHT * 2)
    writeLines(section.title, FONT_SIZE_HEADING, true)

    if (section.type === 'kv') {
      for (const row of section.rows) writeLines(`${row.label}: ${row.value}`, FONT_SIZE_BODY, false)
    } else if (section.type === 'text') {
      for (const p of section.paragraphs) writeLines(p, FONT_SIZE_BODY, false)
    } else if (section.type === 'table') {
      if (section.note) writeLines(section.note, FONT_SIZE_BODY, false)
      for (const row of section.rows) {
        const line = section.columns.map((col, i) => `${col}: ${row[i] ?? '—'}`).join(' · ')
        writeLines(line, FONT_SIZE_BODY, false)
      }
    } else {
      for (const link of section.links) writeLines(`${link.label}: ${link.url}`, FONT_SIZE_BODY, false)
    }
    y += LINE_HEIGHT / 2
  }

  for (const section of report.sections) writeSection(section)

  return doc.output('blob')
}
