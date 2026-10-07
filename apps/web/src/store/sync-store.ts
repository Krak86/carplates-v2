import { create } from 'zustand'

type SyncState = {
  /** How many of the oldest favorites the 100-entry cap just dropped; 0 = nothing to tell the user. */
  trimmedFavorites: number
  setTrimmedFavorites: (count: number) => void
}

export const useSyncStore = create<SyncState>(set => ({
  trimmedFavorites: 0,
  setTrimmedFavorites: count => set({ trimmedFavorites: count })
}))
