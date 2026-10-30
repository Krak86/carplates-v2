import { downloadBlob, downloadText, toFileStem } from '@/lib/download'
import type { ExportFormat, ExportReport } from '@/lib/export-report'
import { toCsv, toMarkdown, toPlainText } from '@/lib/record-formats'
import { copyToClipboard } from '@/lib/share-section'

type UseCompareExportActions = {
  run: (format: ExportFormat) => Promise<boolean>
}

/** Delivers a compare report built from what is on screen; nothing is fetched (unlike use-copy-all-info-actions.ts). */
export function useCompareExportActions(build: () => ExportReport): UseCompareExportActions {
  async function run(format: ExportFormat): Promise<boolean> {
    const report = build()
    const stem = toFileStem(`compare_${report.title}`)

    switch (format) {
      case 'clipboard':
        return await copyToClipboard(toPlainText(report))
      case 'txt':
        downloadText(toPlainText(report), `${stem}.txt`, 'text/plain;charset=utf-8')
        return true
      case 'md':
        downloadText(toMarkdown(report), `${stem}.md`, 'text/markdown;charset=utf-8')
        return true
      case 'csv':
        downloadText(toCsv(report), `${stem}.csv`, 'text/csv;charset=utf-8')
        return true
      case 'docx': {
        const { toDocxBlob } = await import('@/lib/export-docx')
        downloadBlob(await toDocxBlob(report), `${stem}.docx`)
        return true
      }
      case 'pdf': {
        const { toPdfBlob } = await import('@/lib/export-pdf')
        downloadBlob(await toPdfBlob(report), `${stem}.pdf`)
        return true
      }
    }
  }

  return { run }
}
