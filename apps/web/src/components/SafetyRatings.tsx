import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CncapRatings from '@/components/CncapRatings'
import EuroNcapRatings from '@/components/EuroNcapRatings'
import InfoPopover from '@/components/InfoPopover'
import JncapRatings from '@/components/JncapRatings'
import NhtsaRatings from '@/components/NhtsaRatings'
import {
  NHTSA_CURRENT_BRANDS,
  NHTSA_DISCONTINUED_BRANDS,
  NHTSA_UNCOVERED_EXAMPLE_BRANDS
} from '@/components/SafetyRatings.brands'
import { cn } from '@/lib/cn'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  body: string | null
}

type Source = 'euroncap' | 'nhtsa' | 'jncap' | 'cncap'

/**
 * Combined "which cars does this cover" explainer for both sources at once —
 * shown at the section level (not per-tab) so it's visible before the viewer
 * even picks a tab, and so the two disclaimers don't drift apart as separate
 * copies. Euro NCAP's coverage isn't brand-restricted the way NHTSA's is (it
 * tests EU-spec cars, the fleet majority here), so it gets a short paragraph
 * rather than a brand list; NHTSA keeps its current/discontinued/uncovered
 * brand lists, since "which US brands exist" is the actual caveat there.
 */
function CoverageInfo(): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <p>{t('safety.coverageInfoIntro')}</p>
      <div>
        <div className="font-medium">{t('safety.coverageInfoEuroNcapTitle')}</div>
        <p className="text-[var(--color-muted)]">{t('safety.coverageInfoEuroNcapBody')}</p>
      </div>
      <div>
        <div className="font-medium">{t('safety.coverageInfoNhtsaTitle')}</div>
        <p className="mb-1 text-[var(--color-muted)]">{t('safety.brandsInfoIntro')}</p>
        <div>
          <div className="font-medium">{t('safety.brandsInfoCurrent')}</div>
          <div className="text-[var(--color-muted)]">{NHTSA_CURRENT_BRANDS.join(', ')}</div>
        </div>
        <div className="mt-1">
          <div className="font-medium">{t('safety.brandsInfoDiscontinued')}</div>
          <div className="text-[var(--color-muted)]">{NHTSA_DISCONTINUED_BRANDS.join(', ')}</div>
        </div>
        <div className="mt-1">
          <div className="font-medium">{t('safety.brandsInfoUncovered')}</div>
          <div className="text-[var(--color-muted)]">{NHTSA_UNCOVERED_EXAMPLE_BRANDS.join(', ')}</div>
        </div>
      </div>
      <div>
        <div className="font-medium">{t('safety.coverageInfoJncapTitle')}</div>
        <p className="text-[var(--color-muted)]">{t('safety.coverageInfoJncapBody')}</p>
      </div>
      <div>
        <div className="font-medium">{t('safety.coverageInfoCncapTitle')}</div>
        <p className="text-[var(--color-muted)]">{t('safety.coverageInfoCncapBody')}</p>
      </div>
    </div>
  )
}

/**
 * Crash-test safety ratings from four independent sources, tabbed rather than
 * merged since they use different scales/protocols and cover different cars:
 * Euro NCAP (EU-spec, the dominant import stock in Ukraine) is the default,
 * NHTSA (US-spec only), JNCAP (JDM-domestic, never-exported models like
 * Alphard/Crown/Skyline), and C-NCAP (China-market, the BYD/Geely/Chery/Zeekr
 * fleet Ukraine grey-imports in volume) the other three. Each tab fetches its
 * own data only once this section is expanded AND that tab is the active one.
 */
export default function SafetyRatings({ brand, model, year, body }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<Source>('euroncap')
  const hasQuery = Boolean(brand && model && year)

  if (!hasQuery) return null

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-1.5 text-base font-semibold">
          {t('safety.title')}
          <InfoPopover label={t('safety.coverageInfoLabel')} title={t('safety.coverageInfoTitle')}>
            <CoverageInfo />
          </InfoPopover>
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            🛡️
          </span>
          <span className="underline group-hover:no-underline">{open ? t('safety.hide') : t('safety.show')}</span>
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
          <div className="mt-2">
            <div
              role="tablist"
              aria-label={t('safety.title')}
              className="mb-2 flex gap-1 rounded-full bg-[var(--color-border)]/30 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={source === 'euroncap'}
                onClick={() => setSource('euroncap')}
                className={cn(
                  'flex-1 rounded-full px-2 py-1 text-sm whitespace-nowrap transition-colors',
                  source === 'euroncap'
                    ? 'bg-[var(--color-surface)] font-medium shadow-sm'
                    : 'text-[var(--color-muted)]'
                )}
              >
                {t('safety.tabEuroNcap')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === 'nhtsa'}
                onClick={() => setSource('nhtsa')}
                className={cn(
                  'flex-1 rounded-full px-2 py-1 text-sm whitespace-nowrap transition-colors',
                  source === 'nhtsa' ? 'bg-[var(--color-surface)] font-medium shadow-sm' : 'text-[var(--color-muted)]'
                )}
              >
                {t('safety.tabNhtsa')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === 'jncap'}
                onClick={() => setSource('jncap')}
                className={cn(
                  'flex-1 rounded-full px-2 py-1 text-sm whitespace-nowrap transition-colors',
                  source === 'jncap' ? 'bg-[var(--color-surface)] font-medium shadow-sm' : 'text-[var(--color-muted)]'
                )}
              >
                {t('safety.tabJncap')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === 'cncap'}
                onClick={() => setSource('cncap')}
                className={cn(
                  'flex-1 rounded-full px-2 py-1 text-sm whitespace-nowrap transition-colors',
                  source === 'cncap' ? 'bg-[var(--color-surface)] font-medium shadow-sm' : 'text-[var(--color-muted)]'
                )}
              >
                {t('safety.tabCncap')}
              </button>
            </div>

            {source === 'euroncap' && <EuroNcapRatings brand={brand} model={model} year={year} active={open} />}
            {source === 'nhtsa' && <NhtsaRatings brand={brand} model={model} year={year} body={body} active={open} />}
            {source === 'jncap' && <JncapRatings brand={brand} model={model} year={year} active={open} />}
            {source === 'cncap' && <CncapRatings brand={brand} model={model} year={year} active={open} />}
          </div>
        </div>
      </div>
    </div>
  )
}
