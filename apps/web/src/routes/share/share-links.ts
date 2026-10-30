import { shareAliasPath, type ShareAlias } from '@carplates/shared'

/** Campaign tag in the copied link: lower-case letters, digits, `-` and `_`, so it is safe in a URL and in analytics. */
export const sanitizeSource = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)

/** The link to copy for an alias: `/go/<alias>?lang=…[&src=…]`. */
export function buildAliasUrl(origin: string, alias: ShareAlias, lang: string, src: string): string {
  const params = new URLSearchParams({ lang })
  const tag = sanitizeSource(src)
  if (tag) params.set('src', tag)
  return `${origin}${shareAliasPath(alias)}?${params.toString()}`
}

/** The preview card the API renders for an alias (what a messenger shows under the link). */
export const aliasCardPath = (alias: ShareAlias, lang: string): string => `/og/page/go--${alias}.png?lang=${lang}`
