/** Section id → number of bullet items (`install.<id>.<n>`); heading is `install.<id>.h`. */
export const INSTALL_SECTIONS = [
  { id: 'what', items: 5 },
  { id: 'ours', items: 6 },
  { id: 'limits', items: 6 },
  { id: 'cache', items: 5 },
  { id: 'update', items: 4 },
  { id: 'remove', items: 4 },
  { id: 'best', items: 9 }
] as const

export const INSTALL_STEPS = ['android', 'desktop', 'ios'] as const
export type InstallStep = (typeof INSTALL_STEPS)[number]

/** iPhone/iPad (incl. iPadOS reporting as a Mac with touch) — they have no install prompt, only Share → Add to Home Screen. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}
