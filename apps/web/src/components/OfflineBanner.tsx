import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function OfflineBanner(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      className="sticky top-14 z-20 border-b border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-center text-sm font-medium text-amber-800 backdrop-blur-md dark:text-amber-300"
    >
      {t('offline.banner')}
    </div>
  )
}
