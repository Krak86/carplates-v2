import { RELEASE_GROUPS } from '@carplates/shared/releases/core'
import type { ReleaseDay, ReleaseGroup, ReleaseItem } from '@carplates/shared/releases/core'

export { RELEASE_GROUPS }
export type { ReleaseDay, ReleaseGroup, ReleaseItem }

export const RELEASE_GROUP_ICON: Record<ReleaseGroup, string> = {
  new: '✨',
  improved: '🔧',
  data: '🗂️',
  fix: '🐞'
}
