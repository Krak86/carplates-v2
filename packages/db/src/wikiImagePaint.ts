import { createHash } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import type { Db } from './client.js'
import { wikiImagePaint } from './schema.js'

/** Id of a photo's mask in `/api/wiki/paint/<id>.webp`: `md5(image_url)` (unique index `ux_wiki_image_paint_md5`). */
export const wikiPaintMaskId = (imageUrl: string): string => createHash('md5').update(imageUrl).digest('hex')

export type WikiPaintInfo = {
  bucket: string
  lab: [number, number, number]
  w: number
  h: number
  algo: number
}

/** The scan of one photo file, without the mask bytes; null when not scanned, skipped, or incomplete. */
export async function findWikiPaint(db: Db, imageUrl: string): Promise<WikiPaintInfo | null> {
  const [r] = await db
    .select({
      status: wikiImagePaint.status,
      bucket: wikiImagePaint.bucket,
      labL: wikiImagePaint.labL,
      labA: wikiImagePaint.labA,
      labB: wikiImagePaint.labB,
      w: wikiImagePaint.maskW,
      h: wikiImagePaint.maskH,
      algo: wikiImagePaint.algo
    })
    .from(wikiImagePaint)
    .where(eq(wikiImagePaint.imageUrl, imageUrl))
    .limit(1)
  if (r?.status !== 'ok' || !r.bucket || r.labL == null || r.labA == null || r.labB == null || !r.w || !r.h) return null
  return { bucket: r.bucket, lab: [r.labL, r.labA, r.labB], w: r.w, h: r.h, algo: r.algo }
}

/** The mask webp for a `wikiPaintMaskId`, or null. */
export async function findWikiPaintMask(db: Db, id: string): Promise<Buffer | null> {
  const [r] = await db
    .select({ mask: wikiImagePaint.mask })
    .from(wikiImagePaint)
    .where(sql`md5(${wikiImagePaint.imageUrl}) = ${id} AND ${wikiImagePaint.status} = 'ok'`)
    .limit(1)
  return r?.mask ?? null
}
