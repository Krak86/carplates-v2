import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { SIZE_CLASSES, type SizeClass, type SizeShape } from '@/components/size/VehicleSize.helpers'
import { EXPLORER_SHAPES, filterProfiles, parseOneOf, type ModelProfile } from '@/routes/read/helpers'
import { EXPLORER_PAGE } from '@/routes/read/sizes/content'

export type SizeExplorer = {
  shape: SizeShape | null
  cls: SizeClass | null
  text: string
  /** The model the reader came with from a plate card, when it is in the data. */
  highlighted: ModelProfile | null
  results: readonly ModelProfile[]
  total: number
  canShowMore: boolean
  handleShape: (shape: SizeShape | null) => void
  handleClass: (cls: SizeClass | null) => void
  handleText: (text: string) => void
  handleShowMore: () => void
  handleReset: () => void
}

const norm = (value: string | null): string => (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ')

/**
 * The size explorer's state, kept in the URL (`shape`, `class`, `q`; `brand` + `model` mark "your car") so a filtered view
 * can be shared and the plate card can open it pre-set. Filtering is client-side over the one size-models rollup.
 */
export function useSizeExplorerActions(profiles: readonly ModelProfile[]): SizeExplorer {
  const [searchParams, setSearchParams] = useSearchParams()
  const [visible, setVisible] = useState(EXPLORER_PAGE)

  const shape = parseOneOf(searchParams.get('shape'), EXPLORER_SHAPES)
  const cls = parseOneOf(searchParams.get('class'), SIZE_CLASSES)
  const text = searchParams.get('q') ?? ''
  const brand = norm(searchParams.get('brand'))
  const model = norm(searchParams.get('model'))

  const highlighted =
    brand && model ? (profiles.find(p => norm(p.model.brand) === brand && norm(p.model.model) === model) ?? null) : null

  const matches = filterProfiles(profiles, { shape, cls, text })
  // "Your car" leads the list even when it is not among the biggest fleets of the filter.
  const ordered =
    highlighted && matches.includes(highlighted) ? [highlighted, ...matches.filter(p => p !== highlighted)] : matches

  const update = (changes: Record<string, string | null>): void => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true, preventScrollReset: true }
    )
    setVisible(EXPLORER_PAGE)
  }

  return {
    shape,
    cls,
    text,
    highlighted,
    results: ordered.slice(0, visible),
    total: ordered.length,
    canShowMore: ordered.length > visible,
    handleShape: next => update({ shape: next }),
    handleClass: next => update({ class: next }),
    handleText: next => update({ q: next }),
    handleShowMore: () => setVisible(count => count + EXPLORER_PAGE),
    handleReset: () => update({ shape: null, class: null, q: null, brand: null, model: null })
  }
}
