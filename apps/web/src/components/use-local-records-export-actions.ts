import { useTranslation } from 'react-i18next'

import { downloadBlob, downloadText, toFileStem } from '@/lib/download'
import { buildLocalRecordsReport } from '@/lib/export-report'
import type { ExportFormat, ExportLocalRecord } from '@/lib/export-report'
import { toCsv, toMarkdown, toPlainText } from '@/lib/export-formats'
import { copyToClipboard } from '@/lib/share-section'

type UseLocalRecordsExportActions = {
  run: (format: ExportFormat) => Promise<boolean>
}

/** Bulk export of the whole History/Favorites list — basic saved-record fields only (value,
 *  label, date), not a per-vehicle deep dive; see use-copy-all-info-actions.ts for that. */
export function useLocalRecordsExportActions(title: string, entries: ExportLocalRecord[]): UseLocalRecordsExportActions {
  const { t } = useTranslation()

  async function run(format: ExportFormat): Promise<boolean> {
    const report = buildLocalRecordsReport(title, entries, t)
    const stem = toFileStem(title)

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
