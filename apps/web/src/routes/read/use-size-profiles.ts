import { useQuery } from '@tanstack/react-query'

import { sizeModelsQuery } from '@/lib/queries'
import { modelId, profileModel, type ModelProfile } from '@/routes/read/helpers'

export type SizeProfiles = {
  profiles: readonly ModelProfile[]
  /** Lookup by registry brand + model (as spelled in the data); undefined when the data does not hold the model. */
  find: (brand: string, model: string) => ModelProfile | undefined
  isPending: boolean
  isError: boolean
}

const NONE: readonly ModelProfile[] = []

/** Every Ukrainian passenger model with its shape and approximate segment (one cached request for all of /read). */
export function useSizeProfiles(): SizeProfiles {
  const { data, isPending, isError } = useQuery(sizeModelsQuery())
  const profiles = data ? data.models.map(profileModel) : NONE
  const byId = new Map(profiles.map(p => [modelId(p.model), p]))

  return { profiles, find: (brand, model) => byId.get(modelId({ brand, model })), isPending, isError }
}
