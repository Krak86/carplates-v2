import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoMeta } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'

type Props = {
  meta: PhotoMeta
}

export default function PhotoMetaInfo({ meta }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { takenAt, latitude, longitude } = meta
  const hasPlace = latitude != null && longitude != null

  return (
    <div className="flex w-full max-w-2xl flex-col gap-1 text-sm text-[var(--color-fg)]/80">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {takenAt && (
          <span>
            📅{' '}
            {t('photo.meta.taken', {
              date: takenAt.toLocaleDateString(toIntlLocale(i18n.language), { dateStyle: 'medium' })
            })}
          </span>
        )}
        {hasPlace && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
            target="_blank"
            rel="noreferrer"
            title={t('photo.meta.openMap')}
            className="underline decoration-dotted hover:text-[var(--color-primary)]"
          >
            📍 {t('photo.meta.place', { coords: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })}
          </a>
        )}
      </p>
    </div>
  )
}
