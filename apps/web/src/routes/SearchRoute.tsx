import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { classifyQuery } from '@carplates/shared'

import ResultCard from '@/components/ResultCard'
import SearchField from '@/components/SearchField'
import Spinner from '@/components/ui/Spinner'
import VinResult from '@/components/VinResult'
import { ApiError } from '@/lib/api'
import { plateQuery, vinQuery } from '@/lib/queries'
import { capture } from '@/lib/telemetry'

export default function SearchRoute(): ReactNode {
  const { t } = useTranslation()
  const params = useParams()
  const raw = params.query ? decodeURIComponent(params.query) : ''
  const kind = raw ? classifyQuery(raw) : null

  const plate = useQuery({ ...plateQuery(raw), enabled: kind === 'plate' })
  const vin = useQuery({ ...vinQuery(raw), enabled: kind === 'vin' })

  const active = kind === 'vin' ? vin : plate

  useEffect(() => {
    if (!raw || active.isPending) return
    capture(kind === 'vin' ? 'vin_searched' : 'plate_searched', { found: active.isSuccess })
  }, [raw, kind, active.isPending, active.isSuccess])

  const notFound = active.error instanceof ApiError && active.error.status === 404

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="mb-1 text-2xl font-bold">{t('app.title')}</h1>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{t('app.tagline')}</p>
        <SearchField initialValue={raw} />
      </div>

      {raw && active.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {active.isError && (
        <p className="text-[var(--color-muted)]">{notFound ? t('result.noResults') : t('result.error')}</p>
      )}

      {kind === 'plate' && plate.isSuccess && <ResultCard data={plate.data} />}
      {kind === 'vin' && vin.isSuccess && <VinResult data={vin.data} />}
    </div>
  )
}
