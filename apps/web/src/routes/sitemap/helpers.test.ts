import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ROUTE_TITLE_KEYS } from '@/hooks/useDocumentTitle'
import { CATALOG_ROUTES, HIDDEN_ROUTES, SITEMAP_GROUPS } from '@/routes/sitemap/helpers'

const appSource = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8')
const appRoutes = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1] as string)
const listed = new Set(SITEMAP_GROUPS.flatMap(g => g.links.map(l => l.to.split('?')[0] as string)))

describe('sitemap', () => {
  it('lists every route of App.tsx or marks it as hidden', () => {
    const known = new Set([...listed, ...HIDDEN_ROUTES, ...CATALOG_ROUTES])
    expect(appRoutes.filter(path => !known.has(path))).toEqual([])
  })

  it('links only to routes that exist', () => {
    expect([...listed].filter(path => !appRoutes.includes(path))).toEqual([])
  })

  it('names every listed page in the document title map', () => {
    expect([...listed].filter(path => path !== '/' && !(path in ROUTE_TITLE_KEYS))).toEqual([])
  })

  it('lists each link once', () => {
    const all = SITEMAP_GROUPS.flatMap(g => g.links.map(l => l.to))
    expect(new Set(all).size).toBe(all.length)
  })
})
