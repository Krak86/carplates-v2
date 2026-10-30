import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { compareHref } from './ref'
import type { CompareRef } from './types'

type Props = {
  /** The car to put in slot A; slot B opens empty. */
  from: CompareRef
}

/** "Compare" chip: opens `/compare` with this car as A. */
export default function CompareChip({ from }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <Link
      to={compareHref(from, null)}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      <span aria-hidden>⚖️</span>
      {t('compare.chip')}
    </Link>
  )
}
