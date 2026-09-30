import { Suspense, lazy, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import PhotoMetaInfo from '@/components/PhotoMetaInfo'
import PhotoThumbnail from '@/components/PhotoThumbnail'
import PlateCandidates from '@/components/PlateCandidates'
import ResultCard from '@/components/ResultCard'
import SearchField from '@/components/SearchField'
import Spinner from '@/components/ui/Spinner'
import { usePlateRecognition } from '@/components/use-plate-recognition'
import VinResult from '@/components/VinResult'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import WikiHeroImage from '@/components/WikiHeroImage'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { recordVisit } from '@/lib/history-db'
import { MAX_DIMENSION } from '@/lib/image'
import { toIntlLocale } from '@/lib/intl'
import { historyQuery, plateQuery, statsQuery, vinQuery } from '@/lib/queries'
import { capture } from '@/lib/telemetry'
import { formatVehicleLabel } from '@/lib/vehicle-label'

const TopStatsPanel = lazy(() => import('@/routes/stats/TopStatsPanel'))

export default function SearchRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const isHome = useLocation().pathname === '/'
  const raw = params.query ? decodeURIComponent(params.query) : ''
  const kind = raw ? classifyQuery(raw) : null
  const isSharedSection = searchParams.has('section')

  const plate = useQuery({ ...plateQuery(raw), enabled: kind === 'plate' })
  const vin = useQuery({ ...vinQuery(raw), enabled: kind === 'vin' })

  const active = kind === 'vin' ? vin : plate
  const stats = useQuery({ ...statsQuery(), enabled: isHome })

  // A saved (persisted) result stays renderable when a refetch fails or is paused offline —
  // render off `data`, not `isSuccess`, which a failed background refetch flips to false.
  const hasData = active.data !== undefined
  const showingSavedCopy = hasData && (!online || active.isError)
  const offlineMiss = !!raw && active.isPending && active.fetchStatus === 'paused'

  let linkedValue: string | null = null
  if (kind === 'plate' && plate.data) linkedValue = plate.data.current.vin
  else if (kind === 'vin' && vin.data) linkedValue = vin.data.registry?.plate ?? null

  // Same brand/model + key `ResultCard`/`VinResult` feed their own `useCarWikiActions` call —
  // duplicated here (cache-shared, staleTime: Infinity) so the hero slot below can decide
  // whether a wiki image exists without lifting that query out of either result component.
  let wikiHeroVehicle: { brand: string | null; model: string | null; key: string | null } | null = null
  if (kind === 'plate' && plate.data) {
    const c = plate.data.current
    wikiHeroVehicle = { brand: c.brand, model: c.model, key: c.vin || plate.data.plate }
  } else if (kind === 'vin' && vin.data) {
    const vehicle = extractVehicleInfo(vin.data)
    wikiHeroVehicle = { brand: vehicle.brand, model: vehicle.model, key: vin.data.vin }
  }

  const {
    recognize,
    isPending: isRecognizing,
    errorKey: recognizeErrorKey,
    photo,
    dismissPhoto,
    selectCandidate
  } = usePlateRecognition({ currentValue: raw || null, linkedValue })

  useEffect(() => {
    if (!raw || active.isPending) return
    capture(kind === 'vin' ? 'vin_searched' : 'plate_searched', { found: active.isSuccess })

    const record = async (visitKind: 'plate' | 'vin', value: string, label: string | null): Promise<void> => {
      await recordVisit(visitKind, value, label)
      await queryClient.invalidateQueries({ queryKey: historyQuery().queryKey })
    }

    if (kind === 'plate' && plate.isSuccess) {
      const c = plate.data.current
      void record(
        'plate',
        plate.data.plate,
        formatVehicleLabel({ brand: c.brand, model: c.model, year: c.makeYear, color: c.color })
      )
    }
    if (kind === 'vin' && vin.isSuccess) {
      void record('vin', vin.data.vin, null)
    }
  }, [raw, kind, active.isPending, active.isSuccess, plate.isSuccess, plate.data, vin.isSuccess, vin.data, queryClient])

  useEffect(() => {
    if (showingSavedCopy) capture('offline_hit', { kind })
  }, [showingSavedCopy, kind, raw])

  const notFound = active.error instanceof ApiError && active.error.status === 404
  const isIdle = !raw

  return (
    <div className="flex min-h-[70vh] flex-col items-center">
      <div
        className={cn(
          'flex w-full flex-col items-center gap-6 transition-[margin-top] duration-500 ease-in-out',
          isIdle ? 'mt-[18vh]' : 'mt-0'
        )}
      >
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-1 text-2xl font-bold">{t('app.title')}</h1>
          <p className="mb-4 inline-block rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-sm text-[var(--color-fg)]">
            {t('app.tagline')}
          </p>
          <SearchField
            initialValue={raw}
            autoFocus={!isSharedSection}
            isRecognizing={isRecognizing}
            recognizeErrorKey={recognizeErrorKey}
            onPickPhoto={recognize}
          />
          <Link
            to="/advanced-search"
            className="mt-2 inline-block text-sm text-[var(--color-primary)] underline hover:no-underline"
          >
            + {t('advancedSearch.viewLink')}
          </Link>
        </div>

        {raw && active.isPending && !offlineMiss && (
          <p className="flex items-center gap-2 rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-[var(--color-muted)]">
            <Spinner /> {t('result.loading')}
          </p>
        )}

        {offlineMiss && (
          <p className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-[var(--color-muted)]">
            {t('offline.notSaved', { value: raw })}
          </p>
        )}

        {active.isError && !hasData && (
          <p className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-[var(--color-muted)]">
            {notFound ? t('result.noResults', { value: raw }) : t('result.error')}
          </p>
        )}

        {showingSavedCopy && (
          <p className="w-full max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
            {t('offline.savedCopy', {
              date: new Date(active.dataUpdatedAt).toLocaleString(toIntlLocale(i18n.language), {
                dateStyle: 'medium',
                timeStyle: 'short'
              })
            })}
          </p>
        )}

        {photo && (
          <PhotoThumbnail url={photo.url} candidates={photo.candidates} active={raw || null} onClose={dismissPhoto} />
        )}
        {photo?.meta && <PhotoMetaInfo meta={photo.meta} />}
        {photo && (
          <p className="flex w-full max-w-2xl items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
            <span aria-hidden>💡</span>
            {t('recognize.photoTips', { max: MAX_DIMENSION })}
          </p>
        )}
        {photo && photo.settled && photo.candidates.length > 0 && (
          <p className="flex w-full max-w-2xl items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
            <span aria-hidden>⚠️</span>
            {t('recognize.accuracyWarning')}
          </p>
        )}
        {!photo && !recognizeErrorKey && wikiHeroVehicle && (
          <WikiHeroImage brand={wikiHeroVehicle.brand} model={wikiHeroVehicle.model} vehicleKey={wikiHeroVehicle.key} />
        )}
        {photo && <PlateCandidates candidates={photo.candidates} active={raw || null} onSelect={selectCandidate} />}

        {!recognizeErrorKey && kind === 'plate' && plate.data && <ResultCard data={plate.data} />}
        {!recognizeErrorKey && kind === 'vin' && vin.data && <VinResult data={vin.data} />}

        <Link
          to="/history"
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-sm text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            🕘
          </span>
          <span className="underline hover:no-underline">{t('history.viewLink')}</span>
        </Link>

        <Link
          to="/stats"
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-sm text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            📊
          </span>
          <span className="underline hover:no-underline">{t('stats.viewLink')}</span>
        </Link>

        <Link
          to="/favorites"
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-sm text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            ⭐
          </span>
          <span className="underline hover:no-underline">{t('favorites.viewLink')}</span>
        </Link>

        {isHome && stats.isSuccess && (
          <LoadErrorBoundary compact>
            <Suspense fallback={null}>
              <div className="w-full max-w-6xl animate-fade-in">
                <TopStatsPanel stats={stats.data} />
              </div>
            </Suspense>
          </LoadErrorBoundary>
        )}
      </div>
    </div>
  )
}
