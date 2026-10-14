import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { leadParts, parseSizeTab, SIZE_TABS, type SizeTab } from '@/components/size/VehicleSize.helpers'
import { useVehicleSize, type VehicleSizeInput } from '@/components/size/use-vehicle-size'
import SectionSkeleton from '@/components/ui/SectionSkeleton'
import { toFieldMap } from '@/components/vin/helpers'
import { cn } from '@/lib/cn'
import { vinQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

// Each tab is its own chunk, fetched the first time it opens; the silhouette paths ride along with the schema tab only.
const SizeSchemaTab = lazy(() => import('@/components/size/SizeSchemaTab'))
const SizeParkingTab = lazy(() => import('@/components/size/SizeParkingTab'))
const SizeGarageTab = lazy(() => import('@/components/size/SizeGarageTab'))
const SizeNormsTab = lazy(() => import('@/components/size/SizeNormsTab'))

type Props = Omit<VehicleSizeInput, 'vinFields'> & {
  /** The car's VIN: decoded only once the section is open, for the wheelbase and a body-class hint. */
  vin?: string | null
  /** Fields of an already decoded VIN (the VIN page); skips the extra request. */
  vinFields?: ReadonlyMap<string, string> | null
  /** Bumped by the header chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
}

const TAB_ICON: Readonly<Record<SizeTab, string>> = { schema: '📐', parking: '🅿️', garage: '🏠', norms: '⚖️' }

/**
 * "Size & parking" section: the car's length, width, height and wheelbase merged from RDW, Wikipedia and the VIN (gaps
 * forecast and labelled), a scaled side + top drawing, and how the car fits Ukrainian, German and US parking places and
 * a garage, with the norms and their sources. Collapsed by default; opens from the header chip (`openSignal`) or a
 * `?section=size&tab=schema|parking|garage|norms` share link. Lazy: mounted by `LazySection`.
 */
export default function VehicleSizeSection({ vin, vinFields, openSignal = 0, ...input }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'size'
  const [open, setOpen] = useState(() => isShared || openSignal > 0)
  const [seenSignal, setSeenSignal] = useState(openSignal)
  const [tab, setTab] = useState<SizeTab>(() => (isShared ? parseSizeTab(searchParams.get('tab')) : 'schema'))
  const sectionRef = useRef<HTMLDivElement>(null)

  // The VIN decode only adds a wheelbase and a body class: ask for it once the reader opens the section.
  const { data: vinData } = useQuery({ ...vinQuery(vin ?? ''), enabled: open && !!vin && !vinFields })
  const fields = vinFields ?? (vinData ? toFieldMap(vinData.results) : null)
  const size = useVehicleSize({ ...input, vinFields: fields })
  const ready = !!size

  // A new chip click opens the section (derived during render, no effect).
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal)
    setOpen(true)
  }

  // Chip click or shared link: scroll once the section is rendered.
  useEffect(() => {
    if ((isShared || openSignal > 0) && ready && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal, ready])

  if (!size) return null

  const { figures, estimated, typicalOnly, shape, cls, dims, sources } = size
  const name = [input.brand, input.model].filter(Boolean).join(' ')
  // Without all three outer sizes (a bus, a truck) there is nothing to fit into a bay: only the figures and the norms.
  const tabs: readonly SizeTab[] = dims ? SIZE_TABS : SIZE_TABS.filter(tabId => tabId === 'schema' || tabId === 'norms')
  const activeTab = tabs.includes(tab) ? tab : 'schema'
  const lead = leadParts(figures, sources.wiki, t).join(' · ')

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📏"
        title={t('size.title')}
        info={<SectionInfo section="size" title={t('size.title')} />}
        actions={<ShareButton section="size" tab={activeTab} label={t('share.button', { section: t('size.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('size.show')}
        hideLabel={t('size.hide')}
      />

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('size.lead', { sources: lead })}</p>

          {typicalOnly && (
            <p className="mt-2 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-sm">
              ≈ {t('size.typicalOnly', { shape: t(`size.shape.${shape}`).toLowerCase() })}
            </p>
          )}
          {!typicalOnly && estimated.length > 0 && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">{t('size.estimatedNote')}</p>
          )}

          <div role="group" aria-label={t('size.title')} className="mt-2 flex flex-wrap gap-1.5">
            {tabs.map(tabId => (
              <button
                key={tabId}
                type="button"
                aria-pressed={activeTab === tabId}
                onClick={() => setTab(tabId)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                  activeTab === tabId
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/20 hover:border-[var(--color-primary)]'
                )}
              >
                <span aria-hidden>{TAB_ICON[tabId]}</span>
                {t(`size.tab.${tabId}`)}
              </button>
            ))}
          </div>

          {open && (
            <Suspense fallback={<SectionSkeleton rows={4} />}>
              {activeTab === 'schema' && (
                <SizeSchemaTab name={name} shape={shape} figures={figures} cls={cls} wiki={sources.wiki} />
              )}
              {activeTab === 'parking' && dims && (
                <SizeParkingTab dims={dims} shape={shape} estimated={estimated.length > 0} />
              )}
              {activeTab === 'garage' && dims && (
                <SizeGarageTab dims={dims} shape={shape} estimated={estimated.length > 0} />
              )}
              {activeTab === 'norms' && <SizeNormsTab dims={dims} cls={cls} />}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
