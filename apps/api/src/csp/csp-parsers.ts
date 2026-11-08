import type { FastifyInstance } from 'fastify'

import { CSP_REPORT_CONTENT_TYPES } from './helpers.js'

/**
 * Fastify only parses JSON/text by default; browsers send reports as `application/csp-report` and
 * `application/reports+json`, both plain JSON. Called from `main.ts` (and by the tests).
 */
export function registerCspParsers(fastify: FastifyInstance): void {
  fastify.addContentTypeParser(CSP_REPORT_CONTENT_TYPES, { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, JSON.parse(body as string))
    } catch {
      done(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }), undefined)
    }
  })
}
