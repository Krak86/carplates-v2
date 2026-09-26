import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExportMenuButton from '@/components/ExportMenuButton'
import type { CopyAllInfoParams } from '@/components/use-copy-all-info-actions'
import { useCopyAllInfoActions } from '@/components/use-copy-all-info-actions'
import { EXPORT_FORMAT_LABEL_KEYS, EXPORT_FORMATS } from '@/lib/export-report'

type Props = CopyAllInfoParams & { className?: string }

/**
 * "Copy all info" — gathers everything the result card can show for this vehicle (basic
 * fields, VIN decode, plate + VIN registration history, all six crash-test safety sources
 * plus their "what do these numbers mean" explainer text, wiki summary, and every photo/video
 * URL) and offers it as a clipboard copy or a txt/md/csv/docx/pdf download. See
 * use-copy-all-info-actions.ts for the fetch-everything-on-demand logic.
 */
export default function CopyAllInfoButton({ className, ...params }: Props): ReactNode {
  const { t } = useTranslation()
  const { pending, run } = useCopyAllInfoActions(params)

  return (
    <ExportMenuButton
      formats={EXPORT_FORMATS}
      formatLabelKey={EXPORT_FORMAT_LABEL_KEYS}
      label={t('export.button')}
      pending={pending}
      onPick={run}
      className={className}
    />
  )
}
