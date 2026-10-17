import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import { withFoundPercent } from '@/routes/wanted/helpers'
import WantedStatsTable from '@/routes/wanted/WantedStatsTable'

await i18nReady

const rows = withFoundPercent([
  { label: 'ALPHA', stolen: 10, found: 9, wanted: 1 },
  { label: 'BRAVO', stolen: 30, found: 3, wanted: 27 },
  { label: 'CHARLIE', stolen: 20, found: 10, wanted: 10 }
])

function renderTable(): void {
  render(<WantedStatsTable rows={rows} dimension="brand" labelHeader="Make" defaultSortKey="stolen" />)
}

/** First-column text of each body row, in display order. */
function labels(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map(r => within(r).getAllByRole('cell')[0]!.textContent ?? '')
}

describe('WantedStatsTable', () => {
  it('sorts by the default key, descending', () => {
    renderTable()
    expect(labels()).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('sorts by found % when that header is clicked, then flips', () => {
    renderTable()
    const header = screen.getAllByRole('columnheader')[4]!
    fireEvent.click(header)
    const first = labels()
    fireEvent.click(header)
    expect(labels()).toEqual([...first].reverse())
    expect(new Set([first[0], labels()[0]])).toEqual(new Set(['Alpha', 'Bravo']))
  })

  it('filters rows', () => {
    renderTable()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'brav' } })
    expect(labels()).toEqual(['Bravo'])
  })
})
