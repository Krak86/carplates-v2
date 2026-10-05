/**
 * Minimal robots.txt matcher for the infocar crawl — we read the file at runtime and refuse any path it disallows
 * for us (`*` group; there is no group for our own token). Supports `Allow`/`Disallow`, `*` wildcards and the `$`
 * end anchor; the longest matching rule wins and `Allow` wins a tie, as in the de-facto standard (RFC 9309).
 */
export type RobotsRules = { allow: string[]; disallow: string[] }

/**
 * Rules of the group(s) that name `agent` (case-insensitive substring of a `User-agent` line), else the `*` group(s).
 * Several groups for the same agent are merged (RFC 9309) — topgear.com repeats `User-agent: *` before every rule.
 */
export function parseRobots(txt: string, agent: string): RobotsRules {
  const groups: { agents: string[]; rules: RobotsRules }[] = []
  let current: { agents: string[]; rules: RobotsRules } | null = null
  let lastWasAgent = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]!.toLowerCase()
    const value = m[2]!.trim()
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current || !value) continue
    if (key === 'allow') current.rules.allow.push(value)
    else if (key === 'disallow') current.rules.disallow.push(value)
  }
  const token = agent.toLowerCase()
  const own = groups.filter(g => g.agents.some(a => a !== '*' && token.includes(a)))
  const matched = own.length ? own : groups.filter(g => g.agents.includes('*'))
  return {
    allow: matched.flatMap(g => g.rules.allow),
    disallow: matched.flatMap(g => g.rules.disallow)
  }
}

function matchLength(pattern: string, path: string): number {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const re = new RegExp(`^${body.split('*').map(escapeRegExp).join('.*')}${anchored ? '$' : ''}`)
  return re.test(path) ? body.replace(/\*/g, '').length : -1
}

const escapeRegExp = (s: string): string => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

/** `path` includes the query string (infocar disallows `/*?`, i.e. every URL with a query). */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  const best = (patterns: string[]): number => Math.max(-1, ...patterns.map(p => matchLength(p, path)))
  const allow = best(rules.allow)
  const disallow = best(rules.disallow)
  return disallow < 0 || allow >= disallow
}
