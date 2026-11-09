import { and, eq } from 'drizzle-orm'

import type { Db } from './client.js'
import { wikiImageCandidate } from './schema.js'

export type WikiCandidateInfo = {
  title: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  photoYear: number | null
  attrAuthor: string | null
  attrLicense: string | null
  attrLicenseUrl: string | null
  bucket: string | null
  lab: [number, number, number] | null
  quality: number
}

/** The scanned `ok` candidate photos of a model (`brand` / `model` lower-cased like `wiki_image`), unranked. */
export async function findWikiCandidates(db: Db, brand: string, model: string): Promise<WikiCandidateInfo[]> {
  const rows = await db
    .select()
    .from(wikiImageCandidate)
    .where(
      and(eq(wikiImageCandidate.brand, brand), eq(wikiImageCandidate.model, model), eq(wikiImageCandidate.status, 'ok'))
    )
  return rows.map(r => ({
    title: r.title,
    imageUrl: r.imageUrl,
    imageWidth: r.imageWidth,
    imageHeight: r.imageHeight,
    photoYear: r.photoYear,
    attrAuthor: r.attrAuthor,
    attrLicense: r.attrLicense,
    attrLicenseUrl: r.attrLicenseUrl,
    bucket: r.bucket,
    lab: r.labL != null && r.labA != null && r.labB != null ? [r.labL, r.labA, r.labB] : null,
    quality: r.quality
  }))
}
