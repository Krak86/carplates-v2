import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { comparisonId, listComparisons, removeComparison, saveComparison } from '@/lib/compare-db'

import { compareHref, parseCompareRef } from './ref'

const SAVED_KEY = ['compare', 'saved'] as const
const savedQuery = {
  queryKey: SAVED_KEY,
  queryFn: listComparisons,
  staleTime: Infinity,
  networkMode: 'always'
} as const

type SaveProps = { a: string; b: string; labelA: string; labelB: string }

/** "Save" toggle for the comparison on screen (kept in this browser only). */
export function CompareSaveButton({ a, b, labelA, labelB }: SaveProps): ReactNode {
  const { t } = useTranslation()
  const client = useQueryClient()
  const saved = useQuery(savedQuery).data ?? []
  const isSaved = saved.some(s => s.id === comparisonId(a, b))
  const mutation = useMutation({
    mutationFn: () => (isSaved ? removeComparison(comparisonId(a, b)) : saveComparison({ a, b, labelA, labelB })),
    onSuccess: () => client.invalidateQueries({ queryKey: SAVED_KEY })
  })

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      onClick={() => mutation.mutate()}
      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      <span aria-hidden>{isSaved ? '★ ' : '☆ '}</span>
      {t(isSaved ? 'compare.saved.unsave' : 'compare.saved.save')}
    </button>
  )
}

/** The comparisons saved in this browser, newest first. */
export function CompareSavedList(): ReactNode {
  const { t } = useTranslation()
  const client = useQueryClient()
  const saved = useQuery(savedQuery).data ?? []
  const mutation = useMutation({
    mutationFn: removeComparison,
    onSuccess: () => client.invalidateQueries({ queryKey: SAVED_KEY })
  })
  if (saved.length === 0) return null

  return (
    <section aria-labelledby="compare-saved-title">
      <h2 id="compare-saved-title" className="mb-1 text-lg font-semibold">
        {t('compare.saved.title')}
      </h2>
      <p className="mb-2 text-sm text-[var(--color-muted)]">{t('compare.saved.note')}</p>
      <ul className="space-y-1.5">
        {saved.map(s => (
          <li key={s.id} className="flex items-center gap-2 text-base">
            <Link
              to={compareHref(parseCompareRef(s.a), parseCompareRef(s.b))}
              className="text-[var(--color-primary)] underline"
            >
              {s.labelA} / {s.labelB}
            </Link>
            <button
              type="button"
              aria-label={t('compare.saved.remove', { name: `${s.labelA} / ${s.labelB}` })}
              onClick={() => mutation.mutate(s.id)}
              className="text-[var(--color-muted)]"
            >
              <span aria-hidden>×</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
