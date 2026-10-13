import { capture } from '@/lib/telemetry'

/** Chromium's non-standard install event; Safari/Firefox never fire it. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach(listener => listener())
}

// Registered from main.tsx: the event fires once, early, usually before the lazy /install chunk has loaded.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
  emit()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred
}

/** Shows the browser's install dialog. The event is single-use, so it is dropped either way. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  deferred = null
  emit()
  await event.prompt()
  const { outcome } = await event.userChoice
  capture('pwa_install_prompt', { outcome })
  return outcome === 'accepted'
}
