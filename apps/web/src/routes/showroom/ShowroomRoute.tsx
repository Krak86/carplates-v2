import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { SHOWROOM_FILTERS, parseShowroomFilter } from '@carplates/shared'
import type { ShowroomFilter } from '@carplates/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Card from '@/components/ui/Card'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { showroomQuery } from '@/lib/queries'
import ShowroomAr from '@/routes/showroom/ShowroomAr'
import ShowroomCard from '@/routes/showroom/ShowroomCard'
import ShowroomCardSkeleton from '@/routes/showroom/ShowroomCardSkeleton'
import ShowroomViewer from '@/routes/showroom/ShowroomViewer'
import { SEARCH_DEBOUNCE_MS } from '@/routes/showroom/helpers'
import type { OpenView } from '@/routes/showroom/helpers'

// Lazy-loaded (see App.tsx).
export default function ShowroomRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const kind = parseShowroomFilter(params.get('kind'))
  const urlQuery = params.get('q') ?? ''
  const [draft, setDraft] = useState(urlQuery)
  const q = useDebouncedValue(draft.trim(), SEARCH_DEBOUNCE_MS)
  const [open, setOpen] = useState<OpenView | null>(null)
  const format = new Intl.NumberFormat(toIntlLocale(i18n.language))

  // The URL follows the (debounced) search, so a link to a search can be shared.
  useEffect(() => {
    if (q === urlQuery) return
    setParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (q) next.set('q', q)
        else next.delete('q')
        return next
      },
      { replace: true }
    )
  }, [q, urlQuery, setParams])

  const setKind = (next: ShowroomFilter): void =>
    setParams(
      prev => {
        const copy = new URLSearchParams(prev)
        if (next === 'all') copy.delete('kind')
        else copy.set('kind', next)
        return copy
      },
      { replace: true }
    )

  const result = useInfiniteQuery(showroomQuery(q, kind))
  const pages = result.data?.pages ?? []
  const items = pages.flatMap(p => p.items)
  const total = pages[0]?.total ?? 0
  const counts = pages[0]?.counts

  // The grid is keyed on the last SETTLED search + tab (derived during render, not an effect): it re-mounts, and its cards ease in,
  // only when new results arrive, not while the previous ones are still shown dimmed.
  const searchKey = `${q}|${kind}`
  const [settledKey, setSettledKey] = useState(searchKey)
  if (!result.isPlaceholderData && result.data && settledKey !== searchKey) setSettledKey(searchKey)

  const filterLabel = (f: ShowroomFilter): string => {
    const n = counts ? format.format(counts[f]) : ''
    const name = t(`showroom.filter.${f}`)
    return n ? `${name} (${n})` : name
  }

  return (
    <article className="mx-auto w-full max-w-6xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-bold">
          <span aria-hidden>🎬</span> {t('showroom.title')}
        </h1>
        <p className="font-medium text-primary">{t('showroom.tagline')}</p>
        <p className="text-muted">{t('showroom.intro')}</p>
      </Card>

      <ShowroomAr onShow3d={() => setKind('3d')} />

      <Card className="space-y-3">
        <input
          type="search"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          aria-label={t('showroom.search')}
          placeholder={t('showroom.search')}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base"
        />
        <div role="group" aria-label={t('showroom.filter.label')} className="flex flex-wrap gap-1.5">
          {SHOWROOM_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={kind === f}
              onClick={() => setKind(f)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors duration-200',
                kind === f ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary'
              )}
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
      </Card>

      {result.isError ? (
        <Card>
          <p className="text-muted">{t('result.error')}</p>
        </Card>
      ) : !result.data ? (
        <ShowroomCardSkeleton />
      ) : items.length === 0 ? (
        <Card key={settledKey} className="animate-fade-in">
          <p className="text-muted">{t('showroom.empty')}</p>
        </Card>
      ) : (
        <>
          <ul
            key={settledKey}
            aria-busy={result.isPlaceholderData}
            className={cn(
              'grid gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              result.isPlaceholderData && 'opacity-50'
            )}
          >
            {items.map((item, i) => (
              <ShowroomCard
                key={`${item.brandSlug}/${item.modelSlug}`}
                item={item}
                index={i}
                onOpen={view => setOpen({ item, kind: view })}
              />
            ))}
          </ul>
          <div className="flex flex-col items-center gap-2 text-sm text-muted">
            <span>{t('showroom.shown', { shown: format.format(items.length), total: format.format(total) })}</span>
            {result.hasNextPage && (
              <button
                type="button"
                onClick={() => void result.fetchNextPage()}
                disabled={result.isFetchingNextPage}
                className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-fg hover:border-primary disabled:opacity-50"
              >
                {t('showroom.more')}
              </button>
            )}
          </div>
        </>
      )}

      {open && <ShowroomViewer open={open} onClose={() => setOpen(null)} />}
    </article>
  )
}
