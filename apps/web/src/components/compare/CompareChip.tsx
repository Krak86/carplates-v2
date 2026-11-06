import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useCompareTray } from '@/store/compare-tray-store'

import { compareHref, formatCompareRef } from './ref'
import type { CompareRef } from './types'

type Props = {
  /** The car this chip belongs to. */
  from: CompareRef
  /** What the car is called in the compare queue (name + plate); defaults to the ref's own text. */
  label?: string
  /** Show the "Compare" half once queued (off on `/compare` itself). */
  showGo?: boolean
}

const SIDE =
  'inline-flex items-center gap-1 px-2 py-0.5 transition-colors hover:text-[var(--color-primary)] focus-visible:outline-2'

/** The ref as plain text (`BE6756HE`, `WBA...`, `bmw 3series 2015`): the queue label when the caller gave none. */
function refText(ref: CompareRef): string {
  if (ref.kind === 'model') return `${ref.make} ${ref.model} ${ref.year}`
  return formatCompareRef(ref).split(':')[1] ?? ''
}

/**
 * Compare queue chip. Not queued: one chip "Add to compare". Queued: a double chip, "Remove from compare" and
 * "Compare" (opens `/compare` with this car and the latest other queued car).
 */
export default function CompareChip({ from, label, showGo = true }: Props): ReactNode {
  const { t } = useTranslation()
  const name = label ?? refText(from)
  const key = formatCompareRef(from)
  const picked = useCompareTray(s => s.items.some(i => formatCompareRef(i.ref) === key))
  const other = useCompareTray(s => s.items.filter(i => formatCompareRef(i.ref) !== key).at(-1)?.ref ?? null)
  const toggle = useCompareTray(s => s.toggle)

  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 text-xs text-[var(--color-fg)]">
      <button
        type="button"
        aria-pressed={picked}
        title={t(picked ? 'compare.tray.remove' : 'compare.tray.add', { name })}
        aria-label={t(picked ? 'compare.tray.remove' : 'compare.tray.add', { name })}
        onClick={() => toggle({ ref: from, label: name })}
        className={SIDE}
      >
        <span aria-hidden>{picked ? '✓' : '⚖️'}</span>
        {t(picked ? 'compare.chip.remove' : 'compare.chip.add')}
      </button>
      {picked && showGo && (
        <Link
          to={compareHref(from, other)}
          title={t('compare.chip')}
          className={`${SIDE} border-l border-[var(--color-border)] text-[var(--color-primary)]`}
        >
          <span aria-hidden>⚖️</span>
          {t('compare.chip')}
          <span aria-hidden>→</span>
        </Link>
      )}
    </span>
  )
}
