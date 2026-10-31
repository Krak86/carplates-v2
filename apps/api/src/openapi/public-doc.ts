import type { OpenAPIObject } from '@nestjs/swagger'

/**
 * Public, read-only endpoints advertised to agents via `/.well-known/ard.json`. Only data derived from the open
 * registry: no per-vehicle lookups (enumerable), no admin / auth / account routes, and nothing built on scraped
 * third-party sources (see docs/legal-and-monetization.md). Extend deliberately, one prefix at a time.
 */
export const PUBLIC_API_PATH_PREFIXES = [
  '/api/stats',
  '/api/wanted/stats',
  '/api/auctions/stats',
  '/api/auctions/lots',
  '/api/catalog'
] as const

const isPublicPath = (path: string): boolean =>
  PUBLIC_API_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))

const SCHEMA_REF = /^#\/components\/schemas\/(.+)$/

/** Every `#/components/schemas/<name>` reachable from `node`, following the referenced schemas too. */
const collectSchemaRefs = (node: unknown, schemas: Record<string, unknown>, found: Set<string>): void => {
  if (Array.isArray(node)) {
    for (const item of node) collectSchemaRefs(item, schemas, found)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      const name = SCHEMA_REF.exec(value)?.[1]
      if (name && !found.has(name)) {
        found.add(name)
        collectSchemaRefs(schemas[name], schemas, found)
      }
    } else {
      collectSchemaRefs(value, schemas, found)
    }
  }
}

/** The generated document narrowed to {@link PUBLIC_API_PATH_PREFIXES}, with unreferenced schemas dropped. */
export function publicOpenApiDoc(doc: OpenAPIObject): OpenAPIObject {
  const paths = Object.fromEntries(Object.entries(doc.paths).filter(([path]) => isPublicPath(path)))
  const allSchemas = (doc.components?.schemas ?? {}) as Record<string, unknown>
  const used = new Set<string>()
  collectSchemaRefs(paths, allSchemas, used)
  const schemas = Object.fromEntries(Object.entries(allSchemas).filter(([name]) => used.has(name)))
  return {
    ...doc,
    paths,
    components: { schemas: schemas as NonNullable<OpenAPIObject['components']>['schemas'] },
    tags: []
  }
}
