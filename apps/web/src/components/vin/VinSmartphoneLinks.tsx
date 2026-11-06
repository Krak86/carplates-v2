import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import ExternalLink from '@/components/ExternalLink'

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
      <ExternalLink href={CARPLAY_URL} className="underline">
        CarPlay
      </ExternalLink>
      {' · '}
      <ExternalLink href={ANDROID_AUTO_URL} className="underline">
        Android Auto
      </ExternalLink>
    </p>
  )
}
