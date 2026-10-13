import type { FastifyRequest } from 'fastify'

import { readDeviceCookie } from './session-cookie.js'

/** What a sign-in needs to know about the caller: shown in the sessions list and used for the new-device notice. */
export type ClientContext = { userAgent: string | undefined; deviceId: string | null }

export function clientContext(req: FastifyRequest): ClientContext {
  return { userAgent: req.headers['user-agent'], deviceId: readDeviceCookie(req.headers.cookie) }
}
