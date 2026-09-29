import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_NEARBY_CATEGORY,
  NEARBY_CATEGORIES,
  NEARBY_CATEGORY_ICON,
  nearbyQueryKey
} from '@/components/NearbyServices.helpers'
import type { NearbyCategory } from '@/components/NearbyServices.helpers'
import { useNearbyLocationActions } from '@/components/use-nearby-location-actions'
import { cn } from '@/lib/cn'
import { nearbyEmbedUrl, nearbyMapsUrl } from '@/lib/maps'

type Props = {
  brand: string | null
}

/** Google Maps search for mechanics / brand dealers / insurance agents around the user's current location. */
export default function NearbyServices({ brand }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<NearbyCategory>(DEFAULT_NEARBY_CATEGORY)
  const { status, coords, handleRequestLocation } = useNearbyLocationActions()
  const query = t(nearbyQueryKey(category, brand), { brand })
  const canRetry = status === 'denied' || status === 'unavailable' || status === 'idle'

  const handleToggle = (): void => {
    const next = !open
    setOpen(next)
    // Opening is the user gesture the permission prompt is tied to.
    if (next && (status === 'idle' || status === 'unavailable')) handleRequestLocation()
  }

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="text-base font-semibold">{t('nearby.title')}</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={handleToggle}
          className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            📍
          </span>
          <span className="underline group-hover:no-underline">{open ? t('nearby.hide') : t('nearby.show')}</span>
          <span
            aria-hidden
            className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
          >
            ▾
          </span>
        </button>
      </div>

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-2">
            <div role="group" aria-label={t('nearby.title')} className="flex flex-wrap gap-1.5">
              {NEARBY_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                    category === c
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]/20 hover:border-[var(--color-primary)]'
                  )}
                >
                  <span aria-hidden>{NEARBY_CATEGORY_ICON[c]}</span>
                  {t(`nearby.category.${c}`)}
                </button>
              ))}
            </div>

            {status === 'locating' && <p className="text-base text-[var(--color-muted)]">{t('nearby.locating')}</p>}
            {status === 'denied' && <p className="text-base text-[var(--color-muted)]">{t('nearby.denied')}</p>}
            {status === 'unavailable' && (
              <p className="text-base text-[var(--color-muted)]">{t('nearby.unavailable')}</p>
            )}
            {status === 'unsupported' && (
              <p className="text-base text-[var(--color-muted)]">{t('nearby.unsupported')}</p>
            )}

            {status !== 'ready' && canRetry && (
              <button
                type="button"
                onClick={handleRequestLocation}
                className="rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-sm text-[var(--color-primary)] underline hover:no-underline"
              >
                {t('nearby.useLocation')}
              </button>
            )}

            {open && coords && (
              <iframe
                key={`${category}-${coords.lat}-${coords.lng}`}
                title={t('nearby.mapTitle', { query })}
                src={nearbyEmbedUrl(query, coords, i18n.language)}
                loading="lazy"
                allowFullScreen
                className="aspect-video w-full rounded-md border border-[var(--color-border)]"
              />
            )}

            <div className="flex items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
              <span>{t('nearby.source')}</span>
              <a
                href={nearbyMapsUrl(query, coords)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-[var(--color-primary)]"
              >
                <span className="underline">{t('nearby.openInMaps')}</span>
                <span aria-hidden>↗</span>
                <span className="sr-only">{t('field.opensNewTab')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
