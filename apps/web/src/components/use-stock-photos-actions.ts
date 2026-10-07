import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { showcaseModels, type WikiImage } from '@carplates/shared'

import { pickRandom, STOCK_ROW_MAX } from '@/lib/new-cars'
import { showcaseImageQuery } from '@/lib/queries'

/** Showcase models probed per view — a few more than a row shows, since some have no photo for a given year. */
const MODELS_PROBED = 6

export type StockPhoto = { model: string; year: number; image: WikiImage }

type StockPhotos = {
  /** ≤ 3 photos of the current model year (the previous year only when the brand has none at all). */
  fresh: StockPhoto[]
  /** ≤ 3 photos of the previous 1–2 model years — pre-owned cars — never the same picture as a fresh one. */
  used: StockPhoto[]
  /** Still looking — callers wait instead of popping in a half-filled row first. */
  isPending: boolean
}

type YearQueries = UseQueryResult<{ image: WikiImage | null }>[]

/** A disabled query stays `pending`, so "settled" only counts the stages that were actually switched on. */
const isSettled = (queries: YearQueries, on: boolean): boolean => !on || queries.every(q => q.status !== 'pending')

function photosOf(models: readonly string[], queries: YearQueries, year: number): StockPhoto[] {
  return models.flatMap((model, i) => {
    const image = queries[i]?.data?.image
    return image ? [{ model, year, image }] : []
  })
}

/** First `max` photos whose picture is not already `taken`, preferring models not already shown. */
function takeDistinct(candidates: StockPhoto[], taken: readonly StockPhoto[], max: number): StockPhoto[] {
  const urls = new Set(taken.map(p => p.image.url))
  const models = new Set(taken.map(p => p.model))
  const fresh = candidates.filter(p => !urls.has(p.image.url))
  const ordered = [...fresh.filter(p => !models.has(p.model)), ...fresh.filter(p => models.has(p.model))]
  const picked: StockPhoto[] = []
  for (const photo of ordered) {
    if (picked.length >= max) break
    if (!picked.some(p => p.image.url === photo.image.url)) picked.push(photo)
  }
  return picked
}

/**
 * Photos for the "cars in stock" rows. New row: the current calendar year only (Commons titles that name it as the model
 * year — see `isModelYearTitle`). Used row: the previous year, then the year before — looked up only when a used row is
 * wanted, and the older year only if the previous one did not fill it. The server answers from `registry.wiki_image` and
 * stores what it finds, so repeat views cost nothing.
 */
export function useStockPhotosActions(brand: string, enabled: boolean, wantUsed: boolean): StockPhotos {
  const [models] = useState(() => pickRandom(showcaseModels(brand), MODELS_PROBED))
  const year = new Date().getFullYear()

  const current = useQueries({ queries: models.map(model => ({ ...showcaseImageQuery(brand, model, year), enabled })) })
  const currentSettled = isSettled(current, enabled)
  const currentPhotos = photosOf(models, current, year)

  // Last year: for the used row — or, when the brand has no current-year photo at all, as the new row's fallback.
  const lastOn = enabled && currentSettled && (wantUsed || currentPhotos.length === 0)
  const last = useQueries({
    queries: models.map(model => ({ ...showcaseImageQuery(brand, model, year - 1), enabled: lastOn }))
  })
  const lastSettled = isSettled(last, lastOn)
  const lastPhotos = photosOf(models, last, year - 1)

  const fresh = currentPhotos.length
    ? takeDistinct(currentPhotos, [], STOCK_ROW_MAX)
    : takeDistinct(lastPhotos, [], STOCK_ROW_MAX)
  const usedFromLast = wantUsed ? takeDistinct(lastPhotos, fresh, STOCK_ROW_MAX) : []

  // Two years back: only to top the used row up.
  const olderOn = enabled && wantUsed && lastSettled && lastOn && usedFromLast.length < STOCK_ROW_MAX
  const older = useQueries({
    queries: models.map(model => ({ ...showcaseImageQuery(brand, model, year - 2), enabled: olderOn }))
  })
  const olderSettled = isSettled(older, olderOn)
  const olderPhotos = photosOf(models, older, year - 2)

  const used = wantUsed ? takeDistinct([...lastPhotos, ...olderPhotos], fresh, STOCK_ROW_MAX) : []
  const isPending = enabled && !(currentSettled && lastSettled && olderSettled)
  return { fresh, used, isPending }
}
