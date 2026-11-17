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
    // Lazy + the `lite` build (EXIF/GPS only, no XMP/IPTC/ICC): ~90 KB stays out of the entry chunk until a photo is picked.
    const exifr = await import('exifr/dist/lite.esm.mjs')
    // No `pick`: in the lite build `parse(file, { pick })` throws ("undefined is not iterable"), which the catch below
    // turned into "no metadata" (date and GPS both lost). The GPS read stays separate (`pick` also filters out latitude/longitude).
    const [raw, gps]: [Record<string, unknown> | undefined, { latitude?: number; longitude?: number } | undefined] =
      await Promise.all([exifr.parse(file), exifr.gps(file)])
    const parsed = photoMetaSchema.safeParse({
      takenAt: raw?.DateTimeOriginal ?? raw?.CreateDate ?? null,
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null
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
