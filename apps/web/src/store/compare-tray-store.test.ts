import { parseCompareRef } from '@carplates/shared'
import { beforeEach, describe, expect, it } from 'vitest'

import { TRAY_SIZE, trayWith, trayWithout, useCompareTray } from './compare-tray-store'

const car = (plate: string): { ref: NonNullable<ReturnType<typeof parseCompareRef>>; label: string } => ({
  ref: parseCompareRef(`plate:${plate}`) as NonNullable<ReturnType<typeof parseCompareRef>>,
  label: plate
})

describe('compare queue', () => {
  beforeEach(() => {
    localStorage.clear()
    useCompareTray.setState({ items: [] })
  })

  it('adds a car once, in either alphabet, and keeps the newest TRAY_SIZE', () => {
    let items = trayWith([], car('BE6756HE'))
    expect(trayWith(items, car('ВЕ6756НЕ'))).toHaveLength(1)
    for (let i = 0; i < TRAY_SIZE + 2; i++) items = trayWith(items, car(`AA${1000 + i}BB`))
    expect(items).toHaveLength(TRAY_SIZE)
    expect(items.at(-1)?.label).toBe(`AA${1000 + TRAY_SIZE + 1}BB`)
  })

  it('removes a car', () => {
    const items = trayWith(trayWith([], car('AA1111BB')), car('AA2222BB'))
    expect(trayWithout(items, car('AA1111BB').ref).map(i => i.label)).toEqual(['AA2222BB'])
  })

  it('toggles and saves to localStorage as text refs', () => {
    useCompareTray.getState().toggle(car('BE6756HE'))
    expect(JSON.parse(localStorage.getItem('carsua.compare-tray') ?? '{}').state.items).toEqual([
      { ref: 'plate:BE6756HE', label: 'BE6756HE' }
    ])
    useCompareTray.getState().toggle(car('BE6756HE'))
    expect(useCompareTray.getState().items).toEqual([])
  })

  it('reads the saved queue back and drops entries that no longer parse', async () => {
    localStorage.setItem(
      'carsua.compare-tray',
      JSON.stringify({
        state: {
          items: [
            { ref: 'plate:BC6743PH', label: 'Kia' },
            { ref: 'car:nonsense', label: 'bad' }
          ]
        },
        version: 1
      })
    )
    await useCompareTray.persist.rehydrate()
    expect(useCompareTray.getState().items.map(i => i.label)).toEqual(['Kia'])
  })
})
