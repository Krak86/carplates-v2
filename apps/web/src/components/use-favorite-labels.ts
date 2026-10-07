import type { FavoriteLabel } from '@carplates/shared'

import { useSession } from '@/components/auth/use-session'
import { useSettingsStore } from '@/store/settings-store'

const NO_LABELS: FavoriteLabel[] = []

/** The signed-in user's favorite labels; empty for anonymous visitors (labels are an account feature). */
export function useFavoriteLabels(): FavoriteLabel[] {
  const { user } = useSession()
  const ownerId = useSettingsStore(s => s.ownerId)
  const labels = useSettingsStore(s => s.settings.labels)
  return user && ownerId === user.id ? labels : NO_LABELS
}
