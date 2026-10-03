import { describe, expect, it } from 'vitest'

import { isAllowed, parseRobots } from './infocar-robots.js'

const TXT = `
User-agent: BUbiNG
Disallow: /

User-agent: *
Disallow: /*?
Disallow: /forum/
Disallow: /search.html
Disallow: /reviews/add/
Allow: /reviews/add/info.html
`

describe('robots', () => {
  const rules = parseRobots(TXT, 'carsua.app-ingest/1.0 (+https://carsua.app)')

  it('uses the * group for an unnamed agent', () => {
    expect(isAllowed(rules, '/test-drive/kia/ceed/')).toBe(true)
    expect(isAllowed(rules, '/reviews/marks.html')).toBe(true)
  })

  it('refuses disallowed paths, wildcard queries and honours a longer Allow', () => {
    expect(isAllowed(rules, '/forum/x')).toBe(false)
    expect(isAllowed(rules, '/search.html')).toBe(false)
    expect(isAllowed(rules, '/reviews/kia/ceed/?year=2019')).toBe(false)
    expect(isAllowed(rules, '/reviews/add/')).toBe(false)
    expect(isAllowed(rules, '/reviews/add/info.html')).toBe(true)
  })

  it('applies a group that names the agent', () => {
    expect(isAllowed(parseRobots(TXT, 'BUbiNG/0.9'), '/test-drive/')).toBe(false)
  })

  it('allows everything when there is no robots.txt content', () => {
    expect(isAllowed(parseRobots('', 'x'), '/anything')).toBe(true)
  })
})
