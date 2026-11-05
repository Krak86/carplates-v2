import { useSearchParams } from 'react-router'
import { REGION_NAMES } from '@carplates/shared'

/** Params a single view owns; the tab switch drops them so one view's choice never leaks into another's. */
export const VIEW_OWN_PARAMS = ['mode', 'kind', 'fuel'] as const
/** The selected region survives tab switches (it means the same thing in every view). */
export const REGION_PARAM = 'region'

/** A URL value restricted to a known list; anything else falls back, so hand-edited links never break a view. */
export const parseChoice = <T extends string>(raw: string | null | undefined, values: readonly T[], fallback: T): T =>
  values.find(v => v === raw) ?? fallback

/** A plate-region name from the URL, or null when absent or unknown. */
export const parseRegionParam = (raw: string | null | undefined): string | null =>
  REGION_NAMES.find(r => r === raw) ?? null

/** One choice of a view (`?mode=`, `?kind=`, `?fuel=`) kept in the URL; the default is left out to keep links short. */
export function useChoiceParam<T extends string>(
  key: (typeof VIEW_OWN_PARAMS)[number],
  values: readonly T[],
  fallback: T
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = parseChoice(searchParams.get(key), values, fallback)
  const set = (next: T): void =>
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        if (next === fallback) params.delete(key)
        else params.set(key, next)
        return params
      },
      { replace: true }
    )
  return [value, set]
}

/** The selected region (`?region=<plate-region name>`) kept in the URL. */
export function useRegionParam(): [string | null, (next: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const region = parseRegionParam(searchParams.get(REGION_PARAM))
  const set = (next: string | null): void =>
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        if (next) params.set(REGION_PARAM, next)
        else params.delete(REGION_PARAM)
        return params
      },
      { replace: true }
    )
  return [region, set]
}
