import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { FitVerdict } from '@/components/size/fit'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { cn } from '@/lib/cn'

type Props = {
  verdict: FitVerdict
  /** The forecast figures behind this verdict are estimates: say so. */
  estimated?: boolean
}

const ICON: Readonly<Record<FitVerdict, string>> = { comfortable: '✅', tight: '⚠️', no: '⛔' }

const TONE: Readonly<Record<FitVerdict, string>> = {
  comfortable: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  tight: 'bg-amber-500/20 text-amber-900 dark:text-amber-300',
  no: 'bg-red-500/15 text-red-800 dark:text-red-300'
}

/** "✅ Comfortable / ⚠️ Tight / ⛔ Does not fit" with a ❓ saying how the verdict is worked out. */
export default function SizeVerdictChip({ verdict, estimated = false }: Props): ReactNode {
  const { t } = useTranslation()
  const label = t(`size.verdict.${verdict}`)

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium', TONE[verdict])}
      >
        <span aria-hidden>{ICON[verdict]}</span>
        {label}
        {estimated && <span className="text-xs font-normal">({t('size.verdict.estimated')})</span>}
      </span>
      <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
        <InfoText text={t(`size.verdict.about.${verdict}`)} />
      </InfoPopover>
    </span>
  )
}
