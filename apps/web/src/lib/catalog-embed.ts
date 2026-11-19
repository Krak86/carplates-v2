import {
  CATALOG_EMBED_ID,
  catalogEmbedSchema,
  type CatalogEmbed,
  type CatalogMake,
  type CatalogMakes,
  type CatalogModel
} from '@carplates/shared'

let cached: CatalogEmbed | null | undefined

/** The data the API injected into the catalog page HTML, Zod-parsed once; null when absent or malformed (the page then fetches). */
function readEmbed(): CatalogEmbed | null {
  if (cached !== undefined) return cached
  try {
    const raw = document.getElementById(CATALOG_EMBED_ID)?.textContent
    const parsed = raw ? catalogEmbedSchema.safeParse(JSON.parse(raw)) : null
    cached = parsed?.success ? parsed.data : null
  } catch {
    cached = null
  }
  return cached
}

/** Seed for `catalogModelQuery`: only the page the server rendered (a later in-app navigation to another model fetches). */
export function embeddedCatalogModel(make: string, model: string): CatalogModel | undefined {
  const e = readEmbed()
  return e?.kind === 'model' && e.data.make === make && e.data.model === model ? e.data : undefined
}

export function embeddedCatalogMake(make: string): CatalogMake | undefined {
  const e = readEmbed()
  return e?.kind === 'make' && e.data.make === make ? e.data : undefined
}

export function embeddedCatalogMakes(): CatalogMakes | undefined {
  const e = readEmbed()
  return e?.kind === 'makes' ? e.data : undefined
}
