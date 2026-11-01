import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import type { Status } from '@/routes/data-status/types'

const TONE: Record<Status, string> = {
  fresh: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  due: 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300',
  stale: 'border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-300',
  failing: 'border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-300',
  frozen: 'border-border text-muted',
  live: 'border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300',
  unknown: 'border-border text-muted'
}

type Props = { status: Status }

export default function StatusChip({ status }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium', TONE[status])}>
      {t(`dataStatus.status.${status}`)}
    </span>
  )
}
