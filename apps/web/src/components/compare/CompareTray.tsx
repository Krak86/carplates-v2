import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { formatCompareRef, compareHref } from './ref'
import type { CompareRef } from './types'
import { useCompareTray } from '@/store/compare-tray-store'

type ButtonProps = { reference: CompareRef; label: string }

/** "Add to compare" toggle for a row or a page header. */
export function CompareTrayButton({ reference, label }: ButtonProps): ReactNode {
  const { t } = useTranslation()
  const picked = useCompareTray(s => s.items.some(i => formatCompareRef(i.ref) === formatCompareRef(reference)))
  const toggle = useCompareTray(s => s.toggle)

  return (
    <button
      type="button"
      aria-pressed={picked}
      title={t(picked ? 'compare.tray.remove' : 'compare.tray.add', { name: label })}
      onClick={() => toggle({ ref: reference, label })}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] aria-pressed:border-[var(--color-primary)] aria-pressed:text-[var(--color-primary)]"
    >
      <span aria-hidden>{picked ? '✓' : '⚖️'}</span>
      {t(picked ? 'compare.tray.added' : 'compare.tray.addShort')}
      <span className="sr-only"> {label}</span>
    </button>
  )
}

/** Sticky bar with the picked cars; "Compare" opens `/compare` with them (one car: it fills slot A). */
export function CompareTrayBar(): ReactNode {
  const { t } = useTranslation()
  const items = useCompareTray(s => s.items)
  const remove = useCompareTray(s => s.remove)
  const clear = useCompareTray(s => s.clear)
  if (items.length === 0) return null

  return (
    <div
      role="region"
      aria-label={t('compare.tray.title')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 shadow-lg"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <ul className="flex flex-wrap gap-2 text-sm">
          {items.map(item => (
            <li
              key={formatCompareRef(item.ref)}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
            >
              {item.label}
              <button
                type="button"
                aria-label={t('compare.tray.remove', { name: item.label })}
                onClick={() => remove(item.ref)}
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
        <Link
          to={compareHref(items[0]?.ref ?? null, items[1]?.ref ?? null)}
          onClick={clear}
          className="ml-auto rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-base text-[var(--color-primary-fg)]"
        >
          {t(items.length === 2 ? 'compare.tray.go' : 'compare.tray.pickOne')}
        </Link>
      </div>
    </div>
  )
}
