import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const CARPLAY_URL = 'https://www.apple.com/ios/carplay/available-models/'
const ANDROID_AUTO_URL = 'https://www.android.com/auto/'

/**
 * Link-out to Apple's and Google's own pages for CarPlay / Android Auto support. Link only: both lists are
 * the vendors' compilations and their terms forbid scraping (PLAN.md, driver assist Step 4).
 */
export default function VinSmartphoneLinks(): ReactNode {
  const { t } = useTranslation()

  return (
    <p className="m-0 text-sm text-[var(--color-muted)]">
      {t('vin.phone.hint')}{' '}
      <a href={CARPLAY_URL} target="_blank" rel="noopener noreferrer" className="underline">
        CarPlay
      </a>
      {' · '}
      <a href={ANDROID_AUTO_URL} target="_blank" rel="noopener noreferrer" className="underline">
        Android Auto
      </a>
    </p>
  )
}
