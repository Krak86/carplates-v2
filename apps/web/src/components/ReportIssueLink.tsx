import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/lib/cn'

type Props = {
  /** What the report is about (a plate or VIN); shown on the Discuss page so the reader can paste it into the comment. */
  about?: string
  className?: string
}

/** Small "found a problem?" link to /discuss, for cards that show registry or third-party data. */
export default function ReportIssueLink({ about, className }: Props): ReactNode {
  const { t } = useTranslation()
  const to = about ? `/discuss?about=${encodeURIComponent(about)}` : '/discuss'

  return (
    <p className={cn('text-center text-xs text-[var(--color-muted)]', className)}>
      <Link viewTransition to={to} title={t('report.hint')} className="underline hover:text-[var(--color-fg)]">
        {t('report.link')}
      </Link>
    </p>
  )
}
