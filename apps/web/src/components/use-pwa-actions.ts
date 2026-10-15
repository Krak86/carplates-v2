import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { capture } from '@/lib/telemetry'

type UsePwaActions = {
  needRefresh: boolean
  offlineReady: boolean
  handleUpdate: () => void
  handleUpdateAndView: () => void
  handleDismiss: () => void
}

// Installed PWAs are exempt from Safari's 7-day storage wipe; persist() also shields them from Chrome eviction.
function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => false)
}

export function usePwaActions(): UsePwaActions {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW()

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) requestPersistentStorage()

    const handleInstalled = (): void => {
      capture('pwa_installed')
      requestPersistentStorage()
    }
    window.addEventListener('appinstalled', handleInstalled)
    return (): void => window.removeEventListener('appinstalled', handleInstalled)
  }, [])

  return {
    needRefresh,
    offlineReady,
    handleUpdate: () => void updateServiceWorker(true),
    // The update reloads the page on the current URL, so point it at /releases first: the reloaded (new) shell lands there.
    handleUpdateAndView: (): void => {
      window.history.pushState(null, '', '/releases')
      void updateServiceWorker(true)
    },
    handleDismiss: (): void => {
      setNeedRefresh(false)
      setOfflineReady(false)
    }
  }
}
