import { useSyncExternalStore } from 'react'

import { isMaintenance, subscribeMaintenance } from '@/lib/maintenance'

/** True while the API answers "maintenance" (deploy gap or planned window); clears on the next successful query. */
export function useMaintenance(): boolean {
  return useSyncExternalStore(subscribeMaintenance, isMaintenance, () => false)
}
