import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import StatsTable from '@/routes/stats/StatsTable'
import type { StatsRow } from '@/routes/stats/types'

await i18nReady

const rows: StatsRow[] = [
  { label: 'Alpha', year: null, totalRows: 10, distinctPlates: 5, distinctVins: 5 },
  { label: 'Bravo', year: null, totalRows: 30, distinctPlates: 20, distinctVins: 20 },
  { label: 'Charlie', year: null, totalRows: 20, distinctPlates: 10, distinctVins: 10 }
]

function renderTable(): void {
  render(<StatsTable rows={rows} labelHeader="Label" showYearColumn={false} defaultSortKey="totalRows" />)
}

/** First-column text of each body row, in display order. */
function labels(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map(r => within(r).getAllByRole('cell')[0]!.textContent ?? '')
}

describe('StatsTable (@tanstack/react-table)', () => {
  it('sorts by the default key, descending', () => {
    renderTable()
    expect(labels()).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('toggles sort when a header is clicked', () => {
    renderTable()
    fireEvent.click(screen.getByRole('columnheader', { name: /Label/ }))
    // first click on an unsorted string column → asc
    expect(labels()).toEqual(['Alpha', 'Bravo', 'Charlie'])
    fireEvent.click(screen.getByRole('columnheader', { name: /Label/ }))
    expect(labels()).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('filters rows with the global filter', () => {
    renderTable()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alp' } })
    expect(screen.queryByText('Alpha')).not.toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })
})
