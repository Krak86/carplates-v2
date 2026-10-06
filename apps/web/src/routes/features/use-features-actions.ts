import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FeaturesResponse, FeaturesUpdateRequest } from '@carplates/shared'

import { saveFeatures } from '@/lib/api'
import { featuresQuery } from '@/lib/queries'

type UseFeaturesActions = {
  save: ReturnType<typeof useMutation<FeaturesResponse, Error, FeaturesUpdateRequest>>
}

export function useFeaturesActions(): UseFeaturesActions {
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: saveFeatures,
    onSuccess: data => queryClient.setQueryData(featuresQuery().queryKey, data)
  })

  return { save }
}
