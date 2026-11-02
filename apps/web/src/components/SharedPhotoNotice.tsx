import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { daysLeft } from '@/lib/share-links'

type Props = {
  /** Set for a live link; omitted for the "link expired" view. */
  expiresAt?: string
}

/** Under a photo opened from a shared link (days left, Report) or in its place when the link is dead. */
export default function SharedPhotoNotice({ expiresAt }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div
      role={expiresAt ? undefined : 'alert'}
      className="w-full max-w-content rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-sm"
    >
      {expiresAt ? (
        <p>{t('photoShare.viewer.note', { count: daysLeft(expiresAt) })}</p>
      ) : (
        <>
          <p className="font-medium">{t('photoShare.viewer.expiredTitle')}</p>
          <p className="text-[var(--color-muted)]">{t('photoShare.viewer.expiredText')}</p>
        </>
      )}
      <p className="mt-1">
        <Link to="/contact" className="text-[var(--color-primary)] underline">
          {t('photoShare.viewer.report')}
        </Link>
      </p>
    </div>
  )
}
