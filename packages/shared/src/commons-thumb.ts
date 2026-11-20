/** Standard Wikimedia thumbnail widths; other sizes are rejected on hotlinks, so only these are ever requested. */
const THUMB_PATH = /^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/.*\/thumb\/.+\/)\d+px-([^/?]+)(\?.*)?$/

/** Width of the small strip thumbnails (shown at 64 px, so 250 covers a 3x screen). */
export const STRIP_THUMB_WIDTH = 250

/** Width of the hero photo: 960 is the standard step above a 412 px phone at 1.75x (~720 device px); the 1280 file is ~40% bigger. */
export const HERO_THUMB_WIDTH = 960

/**
 * A smaller rendition of a Commons/Wikipedia thumbnail URL (`…/thumb/a/ab/File.jpg/1280px-File.jpg` →
 * `…/250px-File.jpg`). Any other URL (our own copy, a non-thumbnail path) is returned untouched, so it is always safe to call.
 */
export function commonsThumbUrl(url: string, width: number = STRIP_THUMB_WIDTH): string {
  const match = THUMB_PATH.exec(url)
  return match ? `${match[1]}${width}px-${match[2]}${match[3] ?? ''}` : url
}
