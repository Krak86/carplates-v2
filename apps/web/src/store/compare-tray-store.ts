import { parseCompareRef } from '@carplates/shared'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'

import { formatCompareRef } from '@/components/compare/ref'
import type { CompareRef } from '@/components/compare/types'

/** The queue is short on purpose: it is a shortlist of cars to compare, the oldest falls off. */
export const TRAY_SIZE = 6

export type TrayItem = { ref: CompareRef; label: string }

type TrayState = {
  items: TrayItem[]
  /** Adds the car, or removes it when it is already there; past `TRAY_SIZE` the oldest is pushed out. */
  toggle: (item: TrayItem) => void
  add: (item: TrayItem) => void
  remove: (ref: CompareRef) => void
  clear: () => void
}

/** What is stored: refs as their URL text, so a stored value is re-validated by the one parser on the way back. */
const storedSchema = z.object({
  items: z.array(z.object({ ref: z.string(), label: z.string() })).max(TRAY_SIZE)
})
type Stored = z.infer<typeof storedSchema>

const keyOf = (ref: CompareRef): string => formatCompareRef(ref)

/** Pure queue operations (tested without the store). */
export const trayWith = (items: TrayItem[], item: TrayItem): TrayItem[] =>
  items.some(i => keyOf(i.ref) === keyOf(item.ref)) ? items : [...items, item].slice(-TRAY_SIZE)
export const trayWithout = (items: TrayItem[], ref: CompareRef): TrayItem[] =>
  items.filter(i => keyOf(i.ref) !== keyOf(ref))

/** The cars picked for "Compare" (plate / VIN cards, catalog rows). Kept in this browser (localStorage), never sent anywhere. */
export const useCompareTray = create<TrayState>()(
  persist<TrayState, [], [], Stored>(
    (set): TrayState => ({
      items: [],
      toggle: (item): void => {
        set(state => ({
          items: state.items.some(i => keyOf(i.ref) === keyOf(item.ref))
            ? trayWithout(state.items, item.ref)
            : trayWith(state.items, item)
        }))
      },
      add: (item): void => {
        set(state => ({ items: trayWith(state.items, item) }))
      },
      remove: (ref): void => {
        set(state => ({ items: trayWithout(state.items, ref) }))
      },
      clear: (): void => {
        set({ items: [] })
      }
    }),
    {
      name: 'carsua.compare-tray',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): Stored => ({ items: state.items.map(i => ({ ref: keyOf(i.ref), label: i.label })) }),
      merge: (persisted, current): TrayState => {
        const parsed = storedSchema.safeParse(persisted)
        if (!parsed.success) return current
        const items = parsed.data.items.flatMap(({ ref, label }) => {
          const value = parseCompareRef(ref)
          return value ? [{ ref: value, label }] : []
        })
        return { ...current, items }
      }
    }
  )
)
