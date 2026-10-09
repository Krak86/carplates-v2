import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Registration } from '@carplates/shared'

import { useVinText } from '@/components/vin/use-vin-text'
import { downloadBlob, downloadText, vehicleFileStem } from '@/lib/download'
import { buildExportReport } from '@/lib/export-report'
import type { ExportFormat, ExportInput, ExportVehicleInfo } from '@/lib/export-report'
import { toCsv, toMarkdown, toPlainText } from '@/lib/export-formats'
import {
  cncapRatingsQuery,
  euroNcapRatingsQuery,
  fuelEconomyQuery,
  fxQuery,
  iihsRatingsQuery,
  jncapRatingsQuery,
  kncapRatingsQuery,
  plateHistoryQuery,
  rdwQuery,
  reviewsQuery,
  safetyRatingsQuery,
  statsTopQuery,
  vdbQuery,
  vehiclePhotosQuery,
  vinQuery,
  wikiInfoQuery
} from '@/lib/queries'
import { copyToClipboard } from '@/lib/share-section'

export type CopyAllInfoParams = {
  vehicle: ExportVehicleInfo
  plate: string | null
  region: string | null
  current: Registration | null
  vin: string | null
  /** Already-available VIN decode results/registry — set by VinResult, whose page load already
   *  fetched them. ResultCard passes null here since it only fetches these lazily. */
  vinDecodeResults: { variable: string; value: string }[] | null
  vinRegistryActions: Registration[] | null
}

type UseCopyAllInfoActions = {
  pending: boolean
  run: (format: ExportFormat) => Promise<boolean>
}

async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch {
    return null
  }
}

// Stats is never saved offline; a default (paused-while-offline) fetch would hang the export forever.
const FAIL_FAST_OFFLINE = { networkMode: 'always', retry: false } as const

/**
 * Gathers every section the "Copy all info" button offers — fetching whatever isn't already
 * cached (all six NCAP sources, wiki, stock photos, plate/VIN history) regardless of which
 * sections the viewer actually has expanded on screen — then renders the requested format.
 */
export function useCopyAllInfoActions(params: CopyAllInfoParams): UseCopyAllInfoActions {
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const vinText = useVinText()
  const [pending, setPending] = useState(false)

  async function gather(): Promise<ExportInput> {
    const { vehicle, plate, vin } = params
    const hasRatingsQuery = Boolean(vehicle.brand && vehicle.model && vehicle.year)
    const hasWikiQuery = Boolean(vehicle.brand || vehicle.model)
    const make = vehicle.brand ?? ''
    const model = vehicle.model ?? ''
    const year = vehicle.year ?? 0

    const [
      plateHistory,
      vinDetail,
      euroncap,
      nhtsa,
      jncap,
      cncap,
      kncap,
      iihs,
      wiki,
      photos,
      stats,
      fuel,
      rdw,
      vdb,
      reviews,
      fx
    ] = await Promise.all([
      plate ? safe(queryClient.ensureQueryData(plateHistoryQuery(plate))) : Promise.resolve(null),
      params.vinDecodeResults == null && vin ? safe(queryClient.ensureQueryData(vinQuery(vin))) : Promise.resolve(null),
      hasRatingsQuery
        ? safe(queryClient.ensureQueryData(euroNcapRatingsQuery(make, model, year)))
        : Promise.resolve(null),
      hasRatingsQuery
        ? safe(queryClient.ensureQueryData(safetyRatingsQuery(make, model, year)))
        : Promise.resolve(null),
      hasRatingsQuery ? safe(queryClient.ensureQueryData(jncapRatingsQuery(make, model, year))) : Promise.resolve(null),
      hasRatingsQuery ? safe(queryClient.ensureQueryData(cncapRatingsQuery(make, model, year))) : Promise.resolve(null),
      hasRatingsQuery ? safe(queryClient.ensureQueryData(kncapRatingsQuery(make, model, year))) : Promise.resolve(null),
      hasRatingsQuery ? safe(queryClient.ensureQueryData(iihsRatingsQuery(make, model, year))) : Promise.resolve(null),
      hasWikiQuery
        ? safe(queryClient.ensureQueryData(wikiInfoQuery(make, model, i18n.language, vehicle.year)))
        : Promise.resolve(null),
      hasWikiQuery
        ? safe(queryClient.ensureQueryData(vehiclePhotosQuery(make, model, vehicle.year)))
        : Promise.resolve(null),
      safe(queryClient.ensureQueryData({ ...statsTopQuery(), ...FAIL_FAST_OFFLINE })),
      hasRatingsQuery
        ? safe(
            queryClient.ensureQueryData(
              fuelEconomyQuery({
                make,
                model,
                year,
                fuel: params.current?.fuel,
                capacity: params.current?.capacity
              })
            )
          )
        : Promise.resolve(null),
      hasRatingsQuery
        ? safe(queryClient.ensureQueryData(rdwQuery(make, model, year, params.current?.kind)))
        : Promise.resolve(null),
      vehicle.brand && vehicle.model
        ? safe(queryClient.ensureQueryData(vdbQuery(make, model, params.current?.kind)))
        : Promise.resolve(null),
      vehicle.brand
        ? safe(queryClient.ensureQueryData(reviewsQuery(make, model, vehicle.year)))
        : Promise.resolve(null),
      safe(queryClient.ensureQueryData({ ...fxQuery(), ...FAIL_FAST_OFFLINE }))
    ])

    return {
      vehicle,
      plate,
      region: params.region,
      current: params.current,
      vin,
      vinText,
      vinDecodeResults: params.vinDecodeResults ?? vinDetail?.results ?? null,
      plateHistoryActions: plateHistory?.actions ?? null,
      vinHistoryActions: params.vinRegistryActions ?? vinDetail?.registry?.actions ?? null,
      wiki,
      fuel,
      photos: photos?.images ?? [],
      euroncap,
      nhtsa,
      jncap,
      cncap,
      kncap,
      iihs,
      stats,
      rdw,
      vdb,
      reviews,
      fx,
      lang: i18n.language
    }
  }

  async function run(format: ExportFormat): Promise<boolean> {
    setPending(true)
    try {
      const input = await gather()
      const report = buildExportReport(input, t)
      const stem = vehicleFileStem({ ...params.vehicle, plate: params.plate, vin: params.vin })

      switch (format) {
        case 'clipboard':
          return await copyToClipboard(toPlainText(report))
        case 'txt':
          downloadText(toPlainText(report), `${stem}.txt`, 'text/plain;charset=utf-8')
          return true
        case 'md':
          downloadText(toMarkdown(report), `${stem}.md`, 'text/markdown;charset=utf-8')
          return true
        case 'csv':
          downloadText(toCsv(report), `${stem}.csv`, 'text/csv;charset=utf-8')
          return true
        case 'docx': {
          const { toDocxBlob } = await import('@/lib/export-docx')
          downloadBlob(await toDocxBlob(report), `${stem}.docx`)
          return true
        }
        case 'pdf': {
          const { toPdfBlob } = await import('@/lib/export-pdf')
          downloadBlob(await toPdfBlob(report), `${stem}.pdf`)
          return true
        }
      }
    } finally {
      setPending(false)
    }
  }

  return { pending, run }
}
