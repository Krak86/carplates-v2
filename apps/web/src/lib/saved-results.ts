import type { QueryClient } from '@tanstack/react-query'

import { listFavorites } from '@/lib/favorites-db'
import { listVisits } from '@/lib/history-db'
import { plateQuery, vinQuery } from '@/lib/queries'

/** Drops saved plate/VIN results (lookup + history) that neither History nor Favorites still lists;
 *  the query persister then rewrites the offline copy without them. `ids` are `${kind}:${value}`. */
export async function forgetSavedResults(queryClient: QueryClient, ids: readonly string[]): Promise<void> {
  const [visits, favorites] = await Promise.all([listVisits(), listFavorites()])
  const stillListed = new Set([...visits, ...favorites].map(entry => entry.id))

  for (const id of ids) {
    if (stillListed.has(id)) continue
    const separator = id.indexOf(':')
    const kind = id.slice(0, separator)
    const value = id.slice(separator + 1)
    if (kind === 'plate') queryClient.removeQueries({ queryKey: plateQuery(value).queryKey })
    else if (kind === 'vin') queryClient.removeQueries({ queryKey: vinQuery(value).queryKey })
  }
}
