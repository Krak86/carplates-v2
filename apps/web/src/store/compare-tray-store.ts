import { create } from 'zustand'

import { formatCompareRef } from '@/components/compare/ref'
import type { CompareRef } from '@/components/compare/types'

export const TRAY_SIZE = 2

export type TrayItem = { ref: CompareRef; label: string }

type TrayState = {
  items: TrayItem[]
  /** Adds the car, or removes it when it is already there; a third car pushes out the oldest. */
  toggle: (item: TrayItem) => void
  remove: (ref: CompareRef) => void
  clear: () => void
}

/** The cars picked on catalog pages for "Compare". Lives for the visit; nothing is stored. */
export const useCompareTray = create<TrayState>((set): TrayState => ({
  items: [],
  toggle: (item): void =>
    set(state => {
      const key = formatCompareRef(item.ref)
      if (state.items.some(i => formatCompareRef(i.ref) === key)) {
        return { items: state.items.filter(i => formatCompareRef(i.ref) !== key) }
      }
      return { items: [...state.items, item].slice(-TRAY_SIZE) }
    }),
  remove: (ref): void =>
    set(state => ({ items: state.items.filter(i => formatCompareRef(i.ref) !== formatCompareRef(ref)) })),
  clear: (): void => set({ items: [] })
}))
