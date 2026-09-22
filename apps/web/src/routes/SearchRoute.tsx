import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import PhotoThumbnail from '@/components/PhotoThumbnail'
import ResultCard from '@/components/ResultCard'
import SearchField from '@/components/SearchField'
import Spinner from '@/components/ui/Spinner'
import { usePlateRecognition } from '@/components/use-plate-recognition'
import VinResult from '@/components/VinResult'
import { ApiError } from '@/lib/api'
import { recordVisit } from '@/lib/history-db'
import { historyQuery, plateQuery, vinQuery } from '@/lib/queries'
import { capture } from '@/lib/telemetry'

export default function SearchRoute(): ReactNode {
  const { t } = useTranslation()
  const params = useParams()
  const queryClient = useQueryClient()
  const raw = params.query ? decodeURIComponent(params.query) : ''
  const kind = raw ? classifyQuery(raw) : null

  const plate = useQuery({ ...plateQuery(raw), enabled: kind === 'plate' })
  const vin = useQuery({ ...vinQuery(raw), enabled: kind === 'vin' })

  const active = kind === 'vin' ? vin : plate

  let linkedValue: string | null = null
  if (kind === 'plate' && plate.isSuccess) linkedValue = plate.data.current.vin
  else if (kind === 'vin' && vin.isSuccess) linkedValue = vin.data.registry?.plate ?? null

  const {
    recognize,
    isPending: isRecognizing,
    errorKey: recognizeErrorKey,
    photo,
    dismissPhoto
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
      void record('plate', plate.data.plate, [c.brand, c.model].filter(Boolean).join(' ') || null)
    }
    if (kind === 'vin' && vin.isSuccess) {
      void record('vin', vin.data.vin, null)
    }
  }, [raw, kind, active.isPending, active.isSuccess, plate.isSuccess, plate.data, vin.isSuccess, vin.data, queryClient])

  const notFound = active.error instanceof ApiError && active.error.status === 404

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="mb-1 text-2xl font-bold">{t('app.title')}</h1>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{t('app.tagline')}</p>
        <SearchField
          initialValue={raw}
          isRecognizing={isRecognizing}
          recognizeErrorKey={recognizeErrorKey}
          onPickPhoto={recognize}
        />
      </div>

      {raw && active.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {active.isError && (
        <p className="text-[var(--color-muted)]">{notFound ? t('result.noResults') : t('result.error')}</p>
      )}

      {photo && <PhotoThumbnail url={photo.url} onClose={dismissPhoto} />}

      {kind === 'plate' && plate.isSuccess && <ResultCard data={plate.data} />}
      {kind === 'vin' && vin.isSuccess && <VinResult data={vin.data} />}

      <Link to="/history" className="text-sm text-[var(--color-primary)] underline hover:no-underline">
        {t('history.viewLink')}
      </Link>
    </div>
  )
}
