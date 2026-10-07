import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { newCarsUrl } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import { useNewCarsShowcaseActions } from '@/components/use-new-cars-showcase-actions'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SHOW_AFTER_SCROLL_PX, SIDE_WIDGETS_DESKTOP_QUERY } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'
import { displayBrand, upperBrand } from '@/lib/display-brand'
import { hostOf, NEW_CARS_AD_COUNT } from '@/lib/new-cars'

const AD_ROTATE_MS = 12_000

type Props = {
  brand: string
}

/** A random ad index different from `current`. */
const nextAd = (current: number): number =>
  (current + 1 + Math.floor(Math.random() * (NEW_CARS_AD_COUNT - 1))) % NEW_CARS_AD_COUNT

/**
 * Right-hand "new <brand> <year>" panel under the news (see SearchRoute's right column): brand logo + current year, a
 * photo of a current-year model (Wikimedia Commons, hotlinked + credited), a short rotating ad line and the brand's
 * importer's new-cars list (`NEW_CARS_URL_BY_SLUG`, else the brand site) — the whole card is one link; the last row repeats it as "<BRAND> <year> in stock".
 * Link-out only: no importer content is fetched. Desktop only, slides in on scroll, dismissible per route.
 */
export default function NewCarsWidget({ brand }: Props): ReactNode {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState<boolean>(() => window.scrollY > SHOW_AFTER_SCROLL_PX)
  const [ad, setAd] = useState(() => Math.floor(Math.random() * NEW_CARS_AD_COUNT))
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showcase = useNewCarsShowcaseActions(brand, isDesktop, { probe: 3, take: 1 })

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > SHOW_AFTER_SCROLL_PX)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setAd(nextAd), AD_ROTATE_MS)
    return (): void => clearInterval(timer)
  }, [])

  const list = newCarsUrl(brand)
  const siteUrl = list?.url ?? null
  if (!isDesktop || !siteUrl || showcase.isPending || dismissedPath === pathname) return null

  const year = new Date().getFullYear()
  const name = displayBrand(brand)
  const first = showcase.items[0]
  const image = first && first.image.url !== failedUrl ? first.image : null
  const credit = [image?.attribution?.author, image?.attribution?.license].filter(Boolean).join(' · ')

  return (
    <aside
      aria-label={t('newCarsWidget.aria', { brand: name })}
      aria-hidden={!scrolled}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-border bg-bg/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        // Mounted only after the first scroll (see useSideWidgetsVisible), so it slides in on insertion.
        'starting:translate-x-8 starting:opacity-0',
        scrolled ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 px-1 text-sm font-semibold">
          <BrandLogo brand={brand} size="sm" />
          <span className="truncate">{t('newCarsWidget.title', { brand: upperBrand(brand), year })}</span>
        </h2>

        <button
          type="button"
          aria-label={t('newCarsWidget.close')}
          title={t('newCarsWidget.close')}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-muted hover:bg-surface hover:text-fg"
        >
          ×
        </button>
      </div>

      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        tabIndex={scrolled ? undefined : -1}
        className="group overflow-hidden rounded-lg border border-border bg-surface/60 transition-colors hover:bg-surface"
      >
        {image && (
          <div className="relative">
            <img
              src={image.url}
              alt={[name, first?.model].filter(Boolean).join(' ')}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(image.url)}
              className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {first?.model && (
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {name} {first?.model}
              </span>
            )}
          </div>
        )}

        <div className="space-y-1 p-2.5">
          <p className="line-clamp-3 min-h-12 text-sm font-medium text-fg group-hover:text-primary">
            {t(`newCarsWidget.ad${ad + 1}`, { brand: name, year })}
          </p>

          <p className="truncate text-xs text-muted">
            {hostOf(siteUrl)} <span aria-hidden>↗</span>
            <span className="sr-only"> — {t('newCarsWidget.opensNewTab')}</span>
          </p>

          {credit && (
            <p className="truncate text-[10px] text-muted/70" title={credit}>
              <span aria-hidden>📷</span> {credit}
            </p>
          )}
        </div>
      </a>

      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        tabIndex={scrolled ? undefined : -1}
        className="rounded-md px-2 py-1.5 text-center text-sm font-medium text-primary hover:bg-surface"
      >
        {t('newCarsWidget.inStock', { brand: upperBrand(brand), year })} <span aria-hidden>→</span>
      </a>
    </aside>
  )
}
