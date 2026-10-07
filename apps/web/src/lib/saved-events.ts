/** Fired after a local favorites/history write (never after a sync merge), so the sync manager can push it. */
export const SAVED_CHANGED_EVENT = 'carplates:saved-changed'

export function notifySavedChanged(): void {
  window.dispatchEvent(new Event(SAVED_CHANGED_EVENT))
}
