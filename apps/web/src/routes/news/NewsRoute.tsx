import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import NewsCard from '@/components/NewsCard'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { NEWS_PAGE_SIZE, NEWS_SEARCH_MIN_CHARS, NEWS_SOURCE_GROUPS, newsLangFilter, sourceIdsOf } from '@/lib/news'
import { newsPageQuery } from '@/lib/queries'

const SEARCH_DEBOUNCE_MS = 350

type View = { sources: string[]; q: string; order: 'asc' | 'desc'; page: number }

// Lazy-loaded (see App.tsx). Live data only: not in the offline cache and never prefetched.
export default function NewsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const searchInput = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selected = (params.get('source') ?? '').split(',').filter(key => NEWS_SOURCE_GROUPS.some(g => g.key === key))
  const q = params.get('q') ?? ''
  const order = params.get('order') === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const view: View = { sources: selected, q, order, page }

  // The input is open when a search is active (e.g. a shared link) or the user opened it.
  const [searchOpen, setSearchOpen] = useState(!!q)
  const [draft, setDraft] = useState(q)
  const news = useQuery(
    newsPageQuery({ page, sources: sourceIdsOf(selected), q, order, lang: newsLangFilter(i18n.language) })
  )

  useEffect(() => (): void => clearTimeout(debounce.current), [])

  const totalPages = news.data ? Math.max(1, Math.ceil(news.data.total / NEWS_PAGE_SIZE)) : 1
  const countOf = (ids: readonly string[]): number =>
    news.data?.sources.filter(s => ids.includes(s.source)).reduce((sum, s) => sum + s.count, 0) ?? 0

  /** Writes the view to the URL; defaults (desc, page 1, empty) are left out so shared links stay short. */
  const update = (patch: Partial<View>): void => {
    const next = { ...view, ...patch }
    const out = new URLSearchParams()
    if (next.sources.length) out.set('source', next.sources.join(','))
    if (next.q) out.set('q', next.q)
    if (next.order === 'asc') out.set('order', 'asc')
    if (next.page > 1) out.set('page', String(next.page))
    setParams(out)
    window.scrollTo({ top: 0 })
  }

  const handleToggleSource = (key: string): void =>
    update({ sources: selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key], page: 1 })

  const handleToggleSearch = (): void => {
    if (searchOpen && !draft) return setSearchOpen(false)
    setSearchOpen(true)
    searchInput.current?.focus()
  }

  const handleSearchChange = (value: string): void => {
    setDraft(value)
    clearTimeout(debounce.current)
    const trimmed = value.trim()
    // Too short to search: wait for more input (an emptied box still clears the search).
    if (trimmed && trimmed.length < NEWS_SEARCH_MIN_CHARS) return
    debounce.current = setTimeout(() => update({ q: trimmed, page: 1 }), SEARCH_DEBOUNCE_MS)
  }

  const handleClearSearch = (): void => {
    clearTimeout(debounce.current)
    setDraft('')
    update({ q: '', page: 1 })
    searchInput.current?.focus()
  }

  const isDefault = !selected.length && !q && order === 'desc' && page === 1

  const handleReset = (): void => {
    clearTimeout(debounce.current)
    setDraft('')
    setSearchOpen(false)
    update({ sources: [], q: '', order: 'desc', page: 1 })
  }

  const tooShort = !!draft.trim() && draft.trim().length < NEWS_SEARCH_MIN_CHARS
  const sortLabel = t(order === 'desc' ? 'news.sortNewest' : 'news.sortOldest')

  return (
    <div className="mx-auto max-w-content space-y-4">
      <h1 className="text-2xl font-bold">
        <span aria-hidden>📰</span> {t('news.heading')}
      </h1>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <section aria-label={t('news.sources')} className="flex min-w-0 flex-1 flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!selected.length}
              onClick={() => update({ sources: [], page: 1 })}
              className={cn(
                'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm transition-colors',
                selected.length ? 'hover:bg-[var(--color-surface)]' : 'bg-[var(--color-surface)] font-medium'
              )}
            >
              {t('news.allSources')}
            </button>

            {NEWS_SOURCE_GROUPS.filter(g => !news.data || selected.includes(g.key) || countOf(g.ids) > 0).map(g => (
              <button
                key={g.key}
                type="button"
                aria-pressed={selected.includes(g.key)}
                onClick={() => handleToggleSource(g.key)}
                className={cn(
                  'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm transition-colors',
                  selected.includes(g.key) ? 'bg-[var(--color-surface)] font-medium' : 'hover:bg-[var(--color-surface)]'
                )}
              >
                {g.label}
                {news.data && <span className="ml-1.5 text-xs text-[var(--color-muted)]">{countOf(g.ids)}</span>}
              </button>
            ))}
          </section>

          <div className="flex shrink-0 gap-1">
            {!isDefault && (
              <button
                type="button"
                onClick={handleReset}
                title={t('news.reset')}
                aria-label={t('news.reset')}
                className="flex h-8 items-center gap-1 rounded-full border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                </svg>
                <span className="hidden sm:inline">{t('news.reset')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => update({ order: order === 'desc' ? 'asc' : 'desc', page: 1 })}
              title={sortLabel}
              aria-label={sortLabel}
              className="flex h-8 items-center gap-1 rounded-full border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface)]"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={cn(
                  'h-4 w-4 transition-transform duration-300 motion-reduce:transition-none',
                  order === 'asc' && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
              <span className="hidden sm:inline">{sortLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSearch}
              aria-expanded={searchOpen}
              aria-controls="news-search"
              title={t('news.search')}
              aria-label={t('news.search')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
                (searchOpen || !!q) && 'bg-[var(--color-surface)] text-[var(--color-primary)]'
              )}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          id="news-search"
          inert={!searchOpen}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
            searchOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="relative">
              <input
                ref={searchInput}
                type="search"
                value={draft}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t('news.searchPlaceholder')}
                aria-label={t('news.searchPlaceholder')}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pr-9 pl-3 outline-none focus:border-[var(--color-primary)] [&::-webkit-search-cancel-button]:hidden"
              />
              <button
                type="button"
                onClick={handleClearSearch}
                inert={!draft}
                aria-label={t('search.clear')}
                title={t('search.clear')}
                className={cn(
                  'absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--color-muted)] transition-opacity duration-200 hover:text-[var(--color-primary)]',
                  draft ? 'opacity-100' : 'pointer-events-none opacity-0'
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <p
              className={cn(
                'mt-1 px-1 text-xs',
                tooShort ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              )}
            >
              {t('news.searchHint', { min: NEWS_SEARCH_MIN_CHARS })}
            </p>
          </div>
        </div>
      </div>

      {news.isPending && <Spinner />}
      {news.isError && <p className="text-sm text-[var(--color-muted)]">{t('result.error')}</p>}
      {news.data && !news.data.items.length && <p className="text-sm text-[var(--color-muted)]">{t('news.empty')}</p>}

      {!!news.data?.items.length && (
        <ul className={cn('space-y-3', news.isPlaceholderData && 'opacity-60 transition-opacity')}>
          {news.data.items.map(item => (
            <li key={item.url}>
              <NewsCard item={item} horizontal compact />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-lg bg-[var(--color-bg)]/85 p-2 text-sm backdrop-blur-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 })}
              className={cn(
                'rounded-lg border border-[var(--color-border)] px-3 py-1.5',
                page <= 1 ? 'opacity-40' : 'hover:bg-[var(--color-surface)]'
              )}
            >
              {t('news.prev')}
            </button>

            <span className="text-[var(--color-muted)]">{t('news.pageOf', { page, totalPages })}</span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => update({ page: page + 1 })}
              className={cn(
                'rounded-lg border border-[var(--color-border)] px-3 py-1.5',
                page >= totalPages ? 'opacity-40' : 'hover:bg-[var(--color-surface)]'
              )}
            >
              {t('news.next')}
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
