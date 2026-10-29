import type { OpenAPIObject } from '@nestjs/swagger'
import { describe, expect, it } from 'vitest'

import { publicOpenApiDoc } from './public-doc.js'

const op = (ref?: string): Record<string, unknown> => ({
  get: {
    responses: {
      '200': { content: { 'application/json': { schema: ref ? { $ref: `#/components/schemas/${ref}` } : {} } } }
    }
  }
})

const doc = {
  openapi: '3.0.0',
  info: { title: 'Cars UA API', version: '0.1' },
  paths: {
    '/api/stats': op('Summary'),
    '/api/stats/top': op('Top'),
    '/api/stats/field/{dimension}': op(),
    '/api/wanted/stats': op(),
    '/api/statsfoo': op('Secret'),
    '/api/admin/usage': op('Secret'),
    '/api/auth/me': op('Account'),
    '/api/plate/{plate}': op('Card')
  },
  components: {
    schemas: {
      Summary: { type: 'object', properties: { top: { $ref: '#/components/schemas/Top' } } },
      Top: { type: 'object' },
      Secret: { type: 'object' },
      Account: { type: 'object' },
      Card: { type: 'object' }
    }
  },
  tags: [{ name: 'admin' }]
} as unknown as OpenAPIObject

describe('publicOpenApiDoc', () => {
  it('keeps only the allowlisted path prefixes (a prefix must end at a path segment)', () => {
    expect(Object.keys(publicOpenApiDoc(doc).paths)).toEqual([
      '/api/stats',
      '/api/stats/top',
      '/api/stats/field/{dimension}',
      '/api/wanted/stats'
    ])
  })

  it('keeps referenced schemas (transitively) and drops the rest', () => {
    expect(Object.keys(publicOpenApiDoc(doc).components?.schemas ?? {}).sort()).toEqual(['Summary', 'Top'])
  })

  it('drops tags and keeps the document info', () => {
    const out = publicOpenApiDoc(doc)
    expect(out.tags).toEqual([])
    expect(out.info.title).toBe('Cars UA API')
  })

  it('does not mutate the input', () => {
    publicOpenApiDoc(doc)
    expect(Object.keys(doc.paths)).toHaveLength(8)
  })
})
