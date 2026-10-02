import { Suspense, lazy, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams, useSearchParams } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import NotFoundInfo from '@/components/NotFoundInfo'
import PhotoMetaInfo from '@/components/PhotoMetaInfo'
import PhotoWarnings from '@/components/PhotoWarnings'
import PhotoThumbnail from '@/components/PhotoThumbnail'
import PlateCandidates from '@/components/PlateCandidates'
import ResultCard from '@/components/ResultCard'
import SearchField from '@/components/SearchField'
import Presence from '@/components/ui/Presence'
import Spinner from '@/components/ui/Spinner'
import { usePlateRecognition } from '@/components/use-plate-recognition'
import VinResult from '@/components/VinResult'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import WikiHeroImage from '@/components/WikiHeroImage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { recordVisit } from '@/lib/history-db'
import { MAX_DIMENSION } from '@/lib/image'
import { toIntlLocale } from '@/lib/intl'
import { fuelStatsQuery, historyQuery, plateQuery, safetyStatsQuery, statsTopQuery, vinQuery } from '@/lib/queries'
import { capture } from '@/lib/telemetry'
import { formatVehicleLabel } from '@/lib/vehicle-label'

const TopStatsPanel = lazy(() => import('@/routes/stats/TopStatsPanel'))
const FuelModelsPanel = lazy(() => import('@/routes/fuel/FuelModelsPanel'))
const SafetyModelsPanel = lazy(() => import('@/routes/safety/SafetyModelsPanel'))

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
  const stats = useQuery({ ...statsTopQuery(), enabled: isHome })
  const fuelStats = useQuery({ ...fuelStatsQuery(), enabled: isHome })
  const safetyStats = useQuery({ ...safetyStatsQuery(), enabled: isHome })

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

  // Title follows the searched value immediately (found or not); the car is appended once loaded.
  let titleCar: string | null = null
  if (kind === 'plate' && plate.data) {
    const c = plate.data.current
    titleCar = formatVehicleLabel({ brand: c.brand, model: c.model, year: c.makeYear, color: null })
  } else if (kind === 'vin' && vin.data) {
    titleCar = formatVehicleLabel({ ...extractVehicleInfo(vin.data), color: null })
  }
  const shownValue = (kind === 'plate' && plate.data?.plate) || (kind === 'vin' && vin.data?.vin) || raw
  useDocumentTitle(shownValue ? [shownValue, titleCar].filter(Boolean).join(' — ') : null)

  const notFound = active.error instanceof ApiError && active.error.status === 404
  // Centered only on a pristine page — any input, photo, or recognition error pins the search to the top.
  const isIdle = !raw && !photo && !recognizeErrorKey
  // The header already shows the vehicle once something is searched or a photo attached — the title steps aside.
  const hideTitle = !!raw || !!photo
  const showNotFound = active.isError && !hasData
  // Any attached photo (pending, failed, or resolved) makes the page about that search — homepage stats step aside.
  const showHomeStats = isHome && !photo

  return (
    <div className="flex min-h-[70vh] flex-col items-center">
      <div
        className={cn(
          'flex w-full flex-col items-center gap-6 transition-[margin-top] duration-500 ease-in-out',
          isIdle ? 'mt-[18vh]' : 'mt-0'
        )}
      >
        <div className="w-full max-w-2xl text-center">
          <div
            aria-hidden={hideTitle}
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
              hideTitle ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mb-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                <h1 className="text-2xl font-bold">{t('app.title')}</h1>
                <p className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-sm text-[var(--color-fg)]">
                  {t('app.tagline')}
                </p>
              </div>
            </div>
          </div>
          <SearchField
            initialValue={raw}
            autoFocus={!isSharedSection}
            isRecognizing={isRecognizing}
            onPickPhoto={recognize}
          />
        </div>

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

        <Presence show={!!photo}>
          {photo && (
            <PhotoThumbnail url={photo.url} candidates={photo.candidates} active={raw || null} onClose={dismissPhoto} />
          )}
        </Presence>
        <Presence show={!!photo?.meta}>{photo?.meta && <PhotoMetaInfo meta={photo.meta} />}</Presence>
        <Presence show={!!photo}>
          {photo && (
            <PhotoWarnings
              meta={photo.meta}
              maxDimension={MAX_DIMENSION}
              showAccuracy={photo.settled && photo.candidates.length > 0}
            />
          )}
        </Presence>
        {!photo && !recognizeErrorKey && wikiHeroVehicle && (
          <WikiHeroImage brand={wikiHeroVehicle.brand} model={wikiHeroVehicle.model} vehicleKey={wikiHeroVehicle.key} />
        )}
        <Presence show={!!photo}>
          {photo && <PlateCandidates candidates={photo.candidates} active={raw || null} onSelect={selectCandidate} />}
        </Presence>

        {!recognizeErrorKey && kind === 'plate' && plate.data && <ResultCard data={plate.data} />}
        {!recognizeErrorKey && kind === 'vin' && vin.data && <VinResult data={vin.data} />}

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

        <Presence show={showNotFound}>
          {notFound && kind === 'plate' ? (
            <NotFoundInfo value={raw} />
          ) : (
            <p className="rounded bg-[var(--color-surface)]/20 px-1.5 py-0.5 text-[var(--color-muted)]">
              {notFound ? t('result.noResults', { value: raw }) : t('result.error')}
            </p>
          )}
        </Presence>

        <Presence show={!!recognizeErrorKey}>
          <p className="w-full max-w-2xl rounded-md bg-[var(--color-surface)]/20 px-3 py-2 text-center text-[var(--color-muted)]">
            {recognizeErrorKey ? t(recognizeErrorKey) : null}
          </p>
        </Presence>

        <Presence show={showHomeStats && stats.isSuccess}>
          {stats.data && (
            <LoadErrorBoundary compact>
              <Suspense fallback={null}>
                <div className="w-full max-w-6xl">
                  <TopStatsPanel stats={stats.data} />
                </div>
              </Suspense>
            </LoadErrorBoundary>
          )}
        </Presence>

        <Presence show={showHomeStats && fuelStats.isSuccess}>
          {fuelStats.data && (
            <LoadErrorBoundary compact>
              <Suspense fallback={null}>
                <div className="w-full max-w-6xl">
                  <FuelModelsPanel stats={fuelStats.data} />
                </div>
              </Suspense>
            </LoadErrorBoundary>
          )}
        </Presence>

        <Presence show={showHomeStats && safetyStats.isSuccess}>
          {safetyStats.data && (
            <LoadErrorBoundary compact>
              <Suspense fallback={null}>
                <div className="w-full max-w-6xl">
                  <SafetyModelsPanel stats={safetyStats.data} />
                </div>
              </Suspense>
            </LoadErrorBoundary>
          )}
        </Presence>
      </div>
    </div>
  )
}
