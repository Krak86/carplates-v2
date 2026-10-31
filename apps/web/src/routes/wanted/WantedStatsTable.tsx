import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  flexRender,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import ColorSwatch from '@/components/ColorSwatch'
import { toIntlLocale } from '@/lib/intl'
import { displayLabel } from '@/routes/wanted/helpers'
import type { WantedDimension, WantedMetric, WantedPlateDimension, WantedTableRow } from '@/routes/wanted/types'

type Props = {
  rows: WantedTableRow[]
  dimension: WantedDimension | WantedPlateDimension
  /** Header of the first count column; defaults to "Stolen" (Garpun passes its own). */
  totalHeader?: string
  /** Drop the found / found % columns (Garpun until a plate has left the feed). */
  hideFound?: boolean
  labelHeader: string
  defaultSortKey: WantedMetric
}

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic }
})

const columnHelper = createColumnHelper<typeof features, WantedTableRow>()

export default function WantedStatsTable({
  rows,
  dimension,
  labelHeader,
  defaultSortKey,
  totalHeader,
  hideFound
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([{ id: defaultSortKey, desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const percentFormat = new Intl.NumberFormat(toIntlLocale(i18n.language), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

  const allColumns = columnHelper.columns([
    columnHelper.accessor('label', {
      header: labelHeader,
      cell: c => (
        <span className="inline-flex items-center gap-1.5">
          {dimension === 'color' && <ColorSwatch value={c.getValue()} />}
          {displayLabel(dimension, c.getValue(), i18n.language)}
        </span>
      )
    }),
    columnHelper.accessor('stolen', {
      header: totalHeader ?? t('wanted.stats.col.stolen'),
      cell: c => numberFormat.format(c.getValue())
    }),
    columnHelper.accessor('found', {
      header: t('wanted.stats.col.found'),
      cell: c => numberFormat.format(c.getValue())
    }),
    columnHelper.accessor('wanted', {
      header: t('wanted.stats.col.wanted'),
      cell: c => numberFormat.format(c.getValue())
    }),
    columnHelper.accessor('foundPercent', {
      header: t('wanted.stats.col.foundPercent'),
      cell: c => `${percentFormat.format(c.getValue())}%`
    })
  ])
  const columns = hideFound
    ? allColumns.filter(c => !('accessorKey' in c) || (c.accessorKey !== 'found' && c.accessorKey !== 'foundPercent'))
    : allColumns

  const table = useTable({
    features,
    data: rows,
    globalFilterFn: 'includesString',
    columns,
    getRowId: row => row.label,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter
  })

  const tableRows = table.getRowModel().rows

  return (
    <div>
      <input
        type="text"
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder={t('stats.filterPlaceholder')}
        aria-label={t('stats.filterPlaceholder')}
        className="mb-3 w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      />

      <div className="max-h-[clamp(320px,70dvh,900px)] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <table className="w-full text-sm tabular-nums">
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
            {tableRows.map(row => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                {row.getAllCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

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
