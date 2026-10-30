import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExportMenuButton from '@/components/ExportMenuButton'
import { useCompareExportActions } from '@/components/use-compare-export-actions'
import { buildCompareReport } from '@/lib/export-compare'
import type { CompareReportInput } from '@/lib/export-compare'
import { EXPORT_FORMAT_LABEL_KEYS, EXPORT_FORMATS } from '@/lib/export-report'

type Props = { input: CompareReportInput; className?: string }

/** Export of what the compare page shows now (the differences-only switch included) as clipboard / txt / md / csv / docx / pdf. */
export default function CompareExportButton({ input, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { run } = useCompareExportActions(() => buildCompareReport(input, t))

  return (
    <ExportMenuButton
      formats={EXPORT_FORMATS}
      formatLabelKey={EXPORT_FORMAT_LABEL_KEYS}
      label={t('compare.export.button')}
      pending={false}
      onPick={run}
      className={className}
    />
  )
}
