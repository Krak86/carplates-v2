import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'

import ColorSwatch from '@/components/ColorSwatch'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { scrollElementIntoView } from '@/lib/share-section'
import type { StatsRow } from '@/routes/stats/types'

// Rows past this many get windowed rendering instead of a plain map — matches
// CLAUDE_RULES.md's "virtualize 50+ rows". Only stats_by_region_year (~380
// rows) crosses it today.
const VIRTUALIZE_THRESHOLD = 50
const ROW_HEIGHT_PX = 40
const HIGHLIGHT_DURATION_MS = 2500

type Props = {
  rows: StatsRow[]
  labelHeader: string
  showYearColumn: boolean
  defaultSortKey: keyof StatsRow
  /** A row's `label` to scroll to and briefly flash on arrival — a badge deep link from ResultCard. */
  highlightLabel?: string
  /** True when `rows` came from the `color` dimension — each `label` is itself a color value. */
  showColorSwatch?: boolean
}

const columnHelper = createColumnHelper<StatsRow>()

export default function StatsTable({
  rows,
  labelHeader,
  showYearColumn,
  defaultSortKey,
  highlightLabel,
  showColorSwatch
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([{ id: defaultSortKey, desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  // Guards against re-scrolling/re-flashing every time tableRows changes reference
  // (sort, filter, background refetch) — the deep link should only act once.
  const handledHighlightRef = useRef<string | null>(null)

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  const columns = [
    columnHelper.accessor('label', {
      header: labelHeader,
      cell: c =>
        showColorSwatch ? (
          <span className="inline-flex items-center gap-1.5">
            <ColorSwatch value={c.getValue()} />
            {c.getValue()}
          </span>
        ) : (
          c.getValue()
        )
    }),
    ...(showYearColumn
      ? [columnHelper.accessor('year', { header: t('stats.column.year'), cell: c => c.getValue() ?? '—' })]
      : []),
    columnHelper.accessor('totalRows', {
      header: t('stats.column.totalRows'),
      cell: c => numberFormat.format(c.getValue())
    }),
    columnHelper.accessor('distinctPlates', {
      header: t('stats.column.distinctPlates'),
      cell: c => numberFormat.format(c.getValue())
    }),
    columnHelper.accessor('distinctVins', {
      header: t('stats.column.distinctVins'),
      cell: c => numberFormat.format(c.getValue())
    })
  ]

  const table = useReactTable({
    data: rows,
    columns,
    // A composite id (label survives sorting; +year disambiguates the 2D rollups, where
    // label alone repeats across years) so the highlight-on-arrival effect below can find
    // a stable target row regardless of the current sort order.
    getRowId: row => `${row.label}::${row.year ?? ''}`,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const tableRows = table.getRowModel().rows
  const shouldVirtualize = tableRows.length > VIRTUALIZE_THRESHOLD

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    enabled: shouldVirtualize
  })

  useEffect(() => {
    if (!highlightLabel || handledHighlightRef.current === highlightLabel) return
    const idx = tableRows.findIndex(r => r.original.label === highlightLabel)
    if (idx === -1) return
    handledHighlightRef.current = highlightLabel
    if (shouldVirtualize) virtualizer.scrollToIndex(idx, { align: 'center' })
    if (parentRef.current) scrollElementIntoView(parentRef.current)
    setHighlightedRowId(tableRows[idx]!.id)
    const timer = setTimeout(() => setHighlightedRowId(null), HIGHLIGHT_DURATION_MS)
    return (): void => clearTimeout(timer)
  }, [highlightLabel, tableRows, shouldVirtualize, virtualizer])

  const visibleRows = shouldVirtualize ? virtualizer.getVirtualItems() : tableRows.map((_, index) => ({ index }))
  const topPad = shouldVirtualize ? (virtualizer.getVirtualItems()[0]?.start ?? 0) : 0
  const bottomPad = shouldVirtualize ? virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0) : 0

  return (
    <div>
      <input
        type="text"
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder={t('stats.filterPlaceholder')}
        className="mb-3 w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      />

      <div
        ref={parentRef}
        className="h-[clamp(280px,calc(100dvh-560px),900px)] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm md:h-[clamp(320px,calc(100dvh-460px),900px)]"
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--color-surface)]">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const sort = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer px-3 py-2 text-left font-medium select-none"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sort === 'asc' && ' ▲'}
                      {sort === 'desc' && ' ▼'}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {topPad > 0 && (
              <tr>
                <td style={{ height: topPad }} />
              </tr>
            )}
            {visibleRows.map(({ index }) => {
              const row = tableRows[index]
              if (!row) return null
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-[var(--color-border)] transition-colors duration-1000',
                    row.id === highlightedRowId && 'bg-[var(--color-primary)]/20'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {bottomPad > 0 && (
              <tr>
                <td style={{ height: bottomPad }} />
              </tr>
            )}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  {t('stats.noRows')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
