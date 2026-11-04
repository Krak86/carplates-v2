import { parseTuningPage } from '@carplates/shared'
import type { Tuning3dPage } from '@carplates/shared'

export const SITEMAP_URL = 'https://www.3dtuning.com/sitemap.xml'

/** Locale the car pages are read under (the others list the same pages); the stored `path` has no locale. */
const READ_LOCALE = 'en-US'

/** Car pages of the 3DTuning sitemap (the file is one ~5 MB line); user build pages and other locales are skipped. Deduplicated by path. */
export function parseSitemap(xml: string): Tuning3dPage[] {
  const byPath = new Map<string, Tuning3dPage>()
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = m[1]!.trim()
    if (!url.includes(`/${READ_LOCALE}/tuning/`)) continue
    const page = parseTuningPage(url)
    if (page) byPath.set(page.path, page)
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
}
