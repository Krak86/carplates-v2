import {
  normalizePlate,
  FAVORITE_LABEL_COLOR_COUNT,
  FAVORITE_LABEL_LIMIT,
  type FavoriteLabel,
  type UserSettings
} from '@carplates/shared'

export const canAddLabel = (settings: UserSettings): boolean => settings.labels.length < FAVORITE_LABEL_LIMIT

/** First palette color no label uses yet (labels free their color when deleted); wraps if somehow all are taken. */
export function nextFreeColor(labels: readonly FavoriteLabel[]): number {
  const used = new Set(labels.map(l => l.color))
  for (let color = 0; color < FAVORITE_LABEL_COLOR_COUNT; color++) if (!used.has(color)) return color
  return labels.length % FAVORITE_LABEL_COLOR_COUNT
}

/** Adds a label with the next free color; a no-op at the limit or for a blank name. */
export function addLabel(settings: UserSettings, id: string, name: string): UserSettings {
  const trimmed = name.trim()
  if (!trimmed || !canAddLabel(settings)) return settings
  return { ...settings, labels: [...settings.labels, { id, name: trimmed, color: nextFreeColor(settings.labels) }] }
}

export function renameLabel(settings: UserSettings, id: string, name: string): UserSettings {
  const trimmed = name.trim()
  if (!trimmed) return settings
  return { ...settings, labels: settings.labels.map(l => (l.id === id ? { ...l, name: trimmed } : l)) }
}

export function deleteLabel(settings: UserSettings, id: string): UserSettings {
  return { ...settings, labels: settings.labels.filter(l => l.id !== id) }
}

/** Adds the id if absent, removes it if present. */
export const toggleTag = (tags: readonly string[], id: string): string[] =>
  tags.includes(id) ? tags.filter(t => t !== id) : [...tags, id]

/** The labels a favorite carries, in the user's label order; ids with no matching label (deleted ones) are skipped. */
export const labelsOf = (labels: readonly FavoriteLabel[], tags: readonly string[] | undefined): FavoriteLabel[] =>
  tags?.length ? labels.filter(l => tags.includes(l.id)) : []

/** CSS custom property holding the label color (see `--label-N` in global.css). */
export const labelColorVar = (color: number): string => `var(--label-${color})`

export const newLabelId = (): string => crypto.randomUUID()

type Searchable = { value: string; label: string | null; tags?: readonly string[] }

/**
 * Favorites matching the search text (plate/VIN or vehicle label, case-insensitive; a plate typed in Latin matches via
 * `normalizePlate`) AND carrying at least one of the selected label ids. An empty query / selection filters nothing.
 */
export function filterFavorites<T extends Searchable>(
  entries: readonly T[],
  query: string,
  labelIds: readonly string[]
): T[] {
  const text = query.trim().toLowerCase()
  const plate = normalizePlate(query).toLowerCase()
  return entries.filter(entry => {
    if (labelIds.length > 0 && !labelIds.some(id => entry.tags?.includes(id))) return false
    if (!text) return true
    const value = entry.value.toLowerCase()
    return (
      value.includes(text) || (plate.length > 0 && value.includes(plate)) || !!entry.label?.toLowerCase().includes(text)
    )
  })
}
