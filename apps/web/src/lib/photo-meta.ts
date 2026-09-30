import exifr from 'exifr'
import { photoMetaSchema, type PhotoMeta } from '@carplates/shared'

/** The open-data registry's earliest registration is 2 Jan 2013 — older-only cars aren't in it. */
export const REGISTRY_START_YEAR = 2013
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

/**
 * Reads capture date + GPS from the ORIGINAL file — `shrinkImage` re-encodes
 * through a canvas, which drops EXIF. Null when the photo has none (screenshots,
 * messenger re-encodes) or can't be parsed.
 */
export async function readPhotoMeta(file: File): Promise<PhotoMeta | null> {
  try {
    const raw: Record<string, unknown> | undefined = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude']
    })
    const parsed = photoMetaSchema.safeParse({
      takenAt: raw?.DateTimeOriginal ?? raw?.CreateDate ?? null,
      latitude: raw?.latitude ?? null,
      longitude: raw?.longitude ?? null
    })
    if (!parsed.success) return null
    const { takenAt, latitude, longitude } = parsed.data
    return takenAt || (latitude != null && longitude != null) ? parsed.data : null
  } catch {
    return null
  }
}

/** Whole years between the capture date and `now`; 0 when unknown or recent. */
export function photoAgeYears(meta: PhotoMeta, now: Date = new Date()): number {
  if (!meta.takenAt) return 0
  return Math.max(0, Math.floor((now.getTime() - meta.takenAt.getTime()) / MS_PER_YEAR))
}

/** True when the photo was taken before the registry data begins (plate may be absent or since re-issued). */
export function isBeforeRegistry(meta: PhotoMeta): boolean {
  return !!meta.takenAt && meta.takenAt.getFullYear() < REGISTRY_START_YEAR
}
