import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { realoemLink } from '@carplates/shared'

import ExternalLink from '@/components/ExternalLink'
import InfoPopover from '@/components/InfoPopover'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Props = {
  vin?: string | null
  brand: string | null
}

/**
 * "Parts catalog" chip: a link-out to RealOEM's BMW catalog, on the car's own page when a VIN is known, else on the make
 * page (catalog routes, plates without a VIN). Renders nothing for other makes or offline. Pure string building, no API.
 */
export default function PartsCatalogChip({ vin = null, brand }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const url = realoemLink(vin, brand)
  if (!url || !online) return null

  const label = t('partsCatalog.title')
  return (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)] transition-colors chip-view hover:border-[var(--color-primary)]">
      <ExternalLink
        href={url}
        rel="noopener noreferrer nofollow"
        className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]"
      >
        <span aria-hidden>🔧</span>
        {label}
      </ExternalLink>
      <InfoPopover label={label} title={label}>
        {t('partsCatalog.hint')}
      </InfoPopover>
    </span>
  )
}
