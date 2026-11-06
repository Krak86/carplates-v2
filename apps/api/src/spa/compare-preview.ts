import { Inject, Injectable } from '@nestjs/common'
import { denormalizePlate, parseCompareRef, type CompareRef } from '@carplates/shared'

import { CatalogService } from '../catalog/catalog.service.js'
import { PreviewService } from './preview.service.js'
import { SITE_NAME, type Lang } from './spa-text.js'

/** One side of a shared comparison, short enough for a link-preview title and the card. */
export type CompareSide = {
  /** `Audi Q5` (or the plate / VIN when the car is unknown). */
  car: string
  /** `2023`, or null. */
  year: string | null
  /** The plate (Latin letters) or VIN; null for a typical model. */
  id: string | null
}

export type ComparePreview = { title: string; description: string; card: { title: string; description: string } }

/** Joins a side's parts: `Audi Q5 BE6756HE`. */
export const sideLabel = (s: CompareSide): string => [s.car, s.id].filter(Boolean).join(' ')

const DESCRIPTION: Record<Lang, (a: string, b: string) => string> = {
  ua: (a, b) => `Порівняння авто поруч: ${a} і ${b}. Потужність, розміри, вага, витрата, ціна, безпека.`,
  ru: (a, b) => `Сравнение авто рядом: ${a} и ${b}. Мощность, размеры, вес, расход, цена, безопасность.`,
  en: (a, b) => `Two cars side by side: ${a} and ${b}. Power, size, weight, consumption, price, safety.`
}

const CARD_TITLE: Record<Lang, string> = { ua: 'Порівняння авто', ru: 'Сравнение авто', en: 'Car comparison' }

/** Pure text of the preview: kept apart from the lookups so it is testable and one place sets the length limits. */
export function composeComparePreview(lang: Lang, a: CompareSide, b: CompareSide): ComparePreview {
  const withYear = (s: CompareSide): string => [sideLabel(s), s.year].filter(Boolean).join(' ')
  // Plates are written in Latin letters (short, and the same as in the shared link).
  const name = (s: CompareSide): string => s.car || s.id || '-'
  const tail = (s: CompareSide): string => [s.id, s.year].filter(Boolean).join(' ')
  return {
    title: `${sideLabel(a) || '-'} vs ${sideLabel(b) || '-'} | ${SITE_NAME}`,
    description: DESCRIPTION[lang](withYear(a), withYear(b)),
    // The card has a big headline (two short lines) and a small description: names above, plates and years below.
    card: {
      title: `${name(a)} vs ${name(b)}`,
      description: `${CARD_TITLE[lang]}: ${tail(a)} / ${tail(b)}`
    }
  }
}

/** The text of a `/compare?a=…&b=…` link preview (title, description, card), read from the same lookups as the plate cards. */
@Injectable()
export class ComparePreviewService {
  constructor(
    @Inject(PreviewService) private readonly previews: PreviewService,
    @Inject(CatalogService) private readonly catalog: CatalogService
  ) {}

  /** `null` unless both slots hold a valid ref: a half-filled or malformed link keeps the page's static tags. */
  async describe(rawA: string | undefined, rawB: string | undefined, lang: Lang): Promise<ComparePreview | null> {
    const refA = parseCompareRef(rawA)
    const refB = parseCompareRef(rawB)
    if (!refA || !refB) return null
    const [a, b] = await Promise.all([this.side(refA, lang), this.side(refB, lang)])
    return composeComparePreview(lang, a, b)
  }

  private async side(ref: CompareRef, lang: Lang): Promise<CompareSide> {
    if (ref.kind === 'model') {
      const model = await this.catalog.get(ref.make, ref.model)
      return {
        car: model ? `${model.makeName} ${model.modelName}` : `${ref.make} ${ref.model}`,
        year: String(ref.year),
        id: null
      }
    }
    const value = ref.kind === 'plate' ? ref.plate : ref.vin
    const id = ref.kind === 'plate' ? denormalizePlate(value) : value
    const preview = await this.previews.describe(value, lang)
    // The card title is `Audi Q5 · 2023` (or `-` / `VIN` when the make is unknown).
    const [name, year] = (preview?.card.title ?? '').split(' · ')
    const known = !!name && name !== '-' && name !== 'VIN'
    return { car: known ? name : '', year: year ?? null, id }
  }
}
