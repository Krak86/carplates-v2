import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useMaintenance } from '@/hooks/useMaintenance'

export default function MaintenanceBanner(): ReactNode {
  const { t } = useTranslation()
  const maintenance = useMaintenance()

  if (!maintenance) return null

  return (
    <div
      role="status"
      className="sticky top-14 z-20 border-b border-sky-500/40 bg-sky-500/15 px-4 py-1.5 text-center text-sm font-medium text-sky-800 backdrop-blur-md dark:text-sky-300"
    >
      {t('maintenance.banner')}
    </div>
  )
}
