import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { tuningLocaleFor, tuningUrl } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

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
 * "Customize in 3D": a link-out to the matching 3DTuning page (their pages cannot be embedded). Renders nothing unless the
 * API found a confident match for this brand, model, year and body, so a wrong link is never shown. Mounted by `LazySection`.
 */
export default function TuningSection({ brand, model, year, body }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const { data } = useQuery({
    ...tuningQuery(brand ?? '', model ?? '', year ?? 0, body),
    enabled: !!(brand && model && year)
  })
  const link = data?.link
  if (!link || !online) return null

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">🛠️ {t('tuning3d.title')}</span>
        <a
          href={tuningUrl(link, tuningLocaleFor(i18n.language))}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]"
        >
          {t('tuning3d.open')} ↗
        </a>
      </div>
      <p className="mt-1 mb-0 text-sm text-[var(--color-muted)]">{t('tuning3d.hint', { year: link.startYear })}</p>
    </div>
  )
}
