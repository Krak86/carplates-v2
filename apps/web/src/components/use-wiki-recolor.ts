import { useQuery } from '@tanstack/react-query'
import type { VehicleColor } from '@carplates/shared'

import { wikiRecolorTarget } from '@/components/wiki-recolor.helpers'
import { wikiPaintMaskQuery, wikiRecolorQuery } from '@/lib/queries'
import { useUiStore } from '@/store/ui-store'

type Params = {
  brand: string | null
  model: string | null
  year: number | null
  /** The photo the hero shows - the filter applies only to the photo its mask was scanned from. */
  imageUrl: string | null
  /** Raw registry colour (`resolveVehicleColor` maps it). */
  color: string | null | undefined
}

type WikiRecolorState = {
  /** The colour to repaint to; set whenever a filter is applicable (also when the user switched it off), null otherwise. */
  target: VehicleColor | null
  enabled: boolean
  /** Decoded mask, only once the filter is on and the mask loaded. */
  mask: { w: number; h: number; data: Uint8ClampedArray } | null
}

/**
 * Decides whether the hero photo gets the colour filter (docs/wiki-recolor-plan.md). Skips - original photo, no button - on:
 * no registry colour, a close paint, a scan of another photo, a failed scan / mask request (silent). The mask is only
 * fetched while the filter is on. Online only: the filter is decoration, offline shows the original.
 */
export function useWikiRecolor({ brand, model, year, imageUrl, color }: Params): WikiRecolorState {
  const enabled = useUiStore(s => s.wikiRecolorEnabled)
  const canAsk = !!imageUrl && !!color && !!(brand || model)
  const recolor = useQuery({ ...wikiRecolorQuery(brand ?? '', model ?? '', year), enabled: canAsk })
  const target = wikiRecolorTarget(recolor.data?.recolor, color, imageUrl)
  const maskUrl = recolor.data?.recolor?.maskUrl ?? ''
  const mask = useQuery({ ...wikiPaintMaskQuery(maskUrl), enabled: !!target && enabled })
  // A failed mask means "no filter": the button goes too, so it never promises something that cannot be drawn.
  if (!target || mask.isError) return { target: null, enabled, mask: null }
  return { target, enabled, mask: enabled ? (mask.data ?? null) : null }
}
