import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExportMenuButton from '@/components/ExportMenuButton'
import { useLocalRecordsExportActions } from '@/components/use-local-records-export-actions'
import { EXPORT_FORMAT_LABEL_KEYS, EXPORT_FORMATS } from '@/lib/export-report'
import type { ExportLocalRecord } from '@/lib/export-report'

type Props = {
  title: string
  entries: ExportLocalRecord[]
  className?: string
}

/** Bulk export button for the History/Favorites list pages — see LocalRecordsExportButton's
 *  sibling CopyAllInfoButton for the per-vehicle deep-dive version. */
export default function LocalRecordsExportButton({ title, entries, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { run } = useLocalRecordsExportActions(title, entries)

  return (
    <ExportMenuButton
      formats={EXPORT_FORMATS}
      formatLabelKey={EXPORT_FORMAT_LABEL_KEYS}
      label={t('export.button')}
      pending={false}
      onPick={run}
      className={className}
      icon="🗂️"
    />
  )
}
