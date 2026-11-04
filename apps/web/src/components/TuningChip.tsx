import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { tuningLocaleFor, tuningUrl } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

import InfoPopover from '@/components/InfoPopover'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { tuningQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry body (`СЕДАН-B`): the match never crosses a body class. */
  body: string | null
}

/**
 * "Customize in 3D" chip: a link-out to the matching 3DTuning page (their pages cannot be embedded). Renders nothing unless the
 * API found a confident match for this brand, model, year and body, so a wrong link is never shown. Hidden offline.
 */
export default function TuningChip({ brand, model, year, body }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const { data } = useQuery({
    ...tuningQuery(brand ?? '', model ?? '', year ?? 0, body),
    enabled: !!(brand && model && year)
  })
  const link = data?.link
  if (!link || !online) return null

  const label = t('tuning3d.title')
  return (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)] transition-colors chip-view hover:border-[var(--color-primary)]">
      <a
        href={tuningUrl(link, tuningLocaleFor(i18n.language))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]"
      >
        <span aria-hidden>🛠️</span>
        {label} ↗
      </a>
      <InfoPopover label={label} title={label}>
        {t('tuning3d.hint', { year: link.startYear })}
      </InfoPopover>
    </span>
  )
}
