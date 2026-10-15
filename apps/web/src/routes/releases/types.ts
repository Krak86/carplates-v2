import type { Lang } from '@/i18n'

export const RELEASE_GROUPS = ['new', 'improved', 'data', 'fix'] as const
export type ReleaseGroup = (typeof RELEASE_GROUPS)[number]

export const RELEASE_GROUP_ICON: Record<ReleaseGroup, string> = {
  new: '✨',
  improved: '🔧',
  data: '🗂️',
  fix: '🐞'
}

export type ReleaseItem = { group: ReleaseGroup } & Record<Lang, string>

export type ReleaseDay = { date: string; items: readonly ReleaseItem[] }
