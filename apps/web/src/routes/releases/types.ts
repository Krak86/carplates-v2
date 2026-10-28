import { RELEASE_GROUPS } from '@carplates/shared/releases'
import type { ReleaseDay, ReleaseGroup, ReleaseItem } from '@carplates/shared/releases'

export { RELEASE_GROUPS }
export type { ReleaseDay, ReleaseGroup, ReleaseItem }

export const RELEASE_GROUP_ICON: Record<ReleaseGroup, string> = {
  new: '✨',
  improved: '🔧',
  data: '🗂️',
  fix: '🐞'
}
