import { useSyncExternalStore } from 'react'

import { getInstallPrompt, promptInstall, subscribeInstallPrompt } from '@/lib/install-prompt'
import { isIos, isStandalone } from '@/routes/install/helpers'

type UseInstallActions = {
  canInstall: boolean
  installed: boolean
  ios: boolean
  handleInstall: () => void
}

export function useInstallActions(): UseInstallActions {
  const canInstall = useSyncExternalStore(subscribeInstallPrompt, () => !!getInstallPrompt())

  return {
    canInstall,
    installed: isStandalone(),
    ios: isIos(navigator.userAgent, navigator.maxTouchPoints),
    handleInstall: () => void promptInstall()
  }
}
