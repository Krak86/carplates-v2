/**
 * Campaign / share links: `/go/<alias>` serves its own link preview (API) and then sends the visitor to the home page,
 * pointing at one search entry (web). One list, so the API meta, the redirect and the `/share` page cannot drift apart.
 */
export const SHARE_ALIASES = ['plate', 'vin', 'plate-photo', 'vin-photo', 'ar', 'login', 'signup'] as const
export type ShareAlias = (typeof SHARE_ALIASES)[number]

export const SHARE_ALIAS_PREFIX = '/go'

export const isShareAlias = (value: unknown): value is ShareAlias =>
  typeof value === 'string' && (SHARE_ALIASES as readonly string[]).includes(value)

export const shareAliasPath = (alias: ShareAlias): string => `${SHARE_ALIAS_PREFIX}/${alias}`

/** The alias a `/go/<alias>` path names (a trailing slash is fine), or null for any other path or an unknown alias. */
export function shareAliasOfPath(pathname: string): ShareAlias | null {
  const [root, alias, ...rest] = pathname.split('/').filter(Boolean)
  return `/${root}` === SHARE_ALIAS_PREFIX && rest.length === 0 && isShareAlias(alias) ? alias : null
}
