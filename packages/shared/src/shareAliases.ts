/**
 * Campaign / share links: `/go/<alias>` serves its own link preview (API) and then sends the visitor to the home page,
 * pointing at one search entry (web). One list, so the API meta, the redirect and the `/share` page cannot drift apart.
 */
export const SHARE_ALIASES = ['plate', 'vin', 'plate-photo', 'vin-photo', 'ar', 'login', 'signup', 'logout'] as const
export type ShareAlias = (typeof SHARE_ALIASES)[number]

export const SHARE_ALIAS_PREFIX = '/go'

export const isShareAlias = (value: unknown): value is ShareAlias =>
  typeof value === 'string' && (SHARE_ALIASES as readonly string[]).includes(value)

export const shareAliasPath = (alias: ShareAlias): string => `${SHARE_ALIAS_PREFIX}/${alias}`

/**
 * Section share links: `/s/<plate|vin|alarms>/<section>`. Some unfurlers (Telegram) treat `/x?section=a` and `/x?section=b` as one
 * page, so a section link is a path of its own: the API serves it with the section's preview, the web then redirects to
 * `/<target>?section=<section>` (query kept).
 */
export const SECTION_ALIAS_PREFIX = '/s'

const SECTION_ID = /^[a-z0-9][a-z0-9-]{0,31}$/

/** `/alarms` sections: their alias carries no target, `/s/<section>` (the section id alone names the whole link). */
export const ALARM_SECTIONS = ['losses', 'map'] as const

const isAlarmSection = (value: string): boolean => (ALARM_SECTIONS as readonly string[]).includes(value)

export const sectionAliasPath = (target: string, section: string): string =>
  target === 'alarms' && isAlarmSection(section)
    ? `${SECTION_ALIAS_PREFIX}/${section}`
    : `${SECTION_ALIAS_PREFIX}/${encodeURIComponent(target)}/${section}`

/**
 * The target and section of a `/s/<target>/<section>` or `/s/<alarms section>` path (a trailing slash is fine), or null for any
 * other path. The long `/s/alarms/<section>` form of the first alarms links keeps working.
 */
export function sectionAliasOfPath(pathname: string): { target: string; section: string } | null {
  const [root, rawTarget, section, ...rest] = pathname.split('/').filter(Boolean)
  if (`/${root}` !== SECTION_ALIAS_PREFIX || !rawTarget || rest.length > 0) return null
  if (!section) return isAlarmSection(rawTarget) ? { target: 'alarms', section: rawTarget } : null
  if (!SECTION_ID.test(section)) return null
  try {
    const target = decodeURIComponent(rawTarget)
    return target && !target.includes('/') ? { target, section } : null
  } catch {
    return null
  }
}

/** The alias a `/go/<alias>` path names (a trailing slash is fine), or null for any other path or an unknown alias. */
export function shareAliasOfPath(pathname: string): ShareAlias | null {
  const [root, alias, ...rest] = pathname.split('/').filter(Boolean)
  return `/${root}` === SHARE_ALIAS_PREFIX && rest.length === 0 && isShareAlias(alias) ? alias : null
}
