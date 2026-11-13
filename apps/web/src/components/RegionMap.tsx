import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { regionMapUrl } from '@/lib/region-centers'

type Props = { region: string }

/** The OpenStreetMap iframe leaks the visitor's IP to a third party, so it loads only after a click. */
export default function RegionMap({ region }: Props): ReactNode {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  const src = regionMapUrl(region)
  if (!src) return null

  if (!shown) {
    return (
      <div className="mt-3 flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] p-4 text-center">
        <button
          type="button"
          onClick={() => setShown(true)}
          className="rounded-lg bg-[var(--color-primary)]/10 px-3 py-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
        >
          {t('map.show')}
        </button>
        <p className="text-sm text-[var(--color-muted)]">{t('map.consent')}</p>
      </div>
    )
  }

  return (
    <iframe
      key={region}
      src={src}
      title={region}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mt-3 h-64 w-full rounded-lg border border-[var(--color-border)]"
    />
  )
}
