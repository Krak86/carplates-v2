import { useRef, useState } from 'react'
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

import { toIntlLocale } from '@/lib/intl'
import type { StatsRow } from '@/routes/stats/types'

// Rows past this many get windowed rendering instead of a plain map — matches
// CLAUDE_RULES.md's "virtualize 50+ rows". Only stats_by_region_year (~380
// rows) crosses it today.
const VIRTUALIZE_THRESHOLD = 50
const ROW_HEIGHT_PX = 40

type Props = {
  rows: StatsRow[]
  labelHeader: string
  showYearColumn: boolean
  defaultSortKey: keyof StatsRow
}

const columnHelper = createColumnHelper<StatsRow>()

export default function StatsTable({ rows, labelHeader, showYearColumn, defaultSortKey }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([{ id: defaultSortKey, desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  const columns = [
    columnHelper.accessor('label', { header: labelHeader }),
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

  const visibleRows = shouldVirtualize ? virtualizer.getVirtualItems() : tableRows.map((_, index) => ({ index }))
  const topPad = shouldVirtualize ? (virtualizer.getVirtualItems()[0]?.start ?? 0) : 0
  const bottomPad = shouldVirtualize
    ? virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0)
    : 0

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
                <tr key={row.id} className="border-t border-[var(--color-border)]">
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
