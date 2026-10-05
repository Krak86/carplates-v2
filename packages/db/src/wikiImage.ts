import { and, eq, sql } from 'drizzle-orm'

import type { Db } from './client.js'
import { wikiImage } from './schema.js'
import type { WikiImageInsert, WikiImageRow } from './schema.js'

/** Shared by the API (`WikiService`) and `scripts/src/wiki-images.ts`: one row by its normalized key. */
export async function findWikiImage(
  db: Db,
  key: { brand: string; model: string; year: number }
): Promise<WikiImageRow | null> {
  const [row] = await db
    .select()
    .from(wikiImage)
    .where(and(eq(wikiImage.brand, key.brand), eq(wikiImage.model, key.model), eq(wikiImage.year, key.year)))
    .limit(1)
  return row ?? null
}

/**
 * Upsert rows by key. A `failed` row never overwrites an existing `ok` row (an error must not erase a good photo);
 * every other status replaces what was there. `refresh` lets an `ok` row be replaced by anything (script `--refresh`).
 */
export async function upsertWikiImages(
  db: Db,
  rows: WikiImageInsert[],
  options: { refresh?: boolean } = {}
): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(wikiImage)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [wikiImage.brand, wikiImage.model, wikiImage.year],
        set: {
          status: sql`excluded.status`,
          imageUrl: sql`excluded.image_url`,
          imageWidth: sql`excluded.image_width`,
          imageHeight: sql`excluded.image_height`,
          attrAuthor: sql`excluded.attr_author`,
          attrLicense: sql`excluded.attr_license`,
          attrLicenseUrl: sql`excluded.attr_license_url`,
          origin: sql`excluded.origin`,
          title: sql`excluded.title`,
          lastHttpStatus: sql`excluded.last_http_status`,
          lastError: sql`excluded.last_error`,
          attempts: sql`excluded.attempts`,
          nextRetryAt: sql`excluded.next_retry_at`,
          updatedAt: sql`now()`
        },
        ...(options.refresh
          ? {}
          : { setWhere: sql`NOT (registry.wiki_image.status = 'ok' AND excluded.status = 'failed')` })
      })
  }
}
