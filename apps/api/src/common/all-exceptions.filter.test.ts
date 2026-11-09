import { BadRequestException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { AllExceptionsFilter, fastifyClientStatus } from './all-exceptions.filter.js'

function run(exception: unknown) {
  let code = 0
  let body = { message: '' }
  const reply = {
    status(c: number) {
      code = c
      return {
        send(b: { message: string }) {
          body = b
        }
      }
    }
  }
  const host = { switchToHttp: () => ({ getResponse: () => reply }) } as unknown as ArgumentsHost
  new AllExceptionsFilter().catch(exception, host)
  return { code, body }
}

describe('AllExceptionsFilter', () => {
  it('keeps an HttpException status', () => {
    expect(run(new BadRequestException('nope')).code).toBe(400)
  })

  it('maps a Fastify-style 4xx error (body parser, 413) to its status, not 500', () => {
    const err = Object.assign(new Error('Invalid JSON'), { statusCode: 400 })
    const { code, body } = run(err)
    expect(code).toBe(400)
    expect(body.message).toBe('Invalid JSON')
    expect(run(Object.assign(new Error('too big'), { statusCode: 413 })).code).toBe(413)
  })

  it('keeps unknown errors and non-4xx statusCodes as a 500 without leaking the message', () => {
    expect(run(new Error('db password in here')).body.message).toBe('Internal server error')
    expect(run(Object.assign(new Error('x'), { statusCode: 200 })).code).toBe(500)
    expect(run(Object.assign(new Error('x'), { statusCode: 503 })).code).toBe(500)
    expect(run('boom').code).toBe(500)
  })
})

describe('fastifyClientStatus', () => {
  it('accepts only integer 4xx codes', () => {
    expect(fastifyClientStatus({ statusCode: 404 })).toBe(404)
    expect(fastifyClientStatus({ statusCode: '400' })).toBeUndefined()
    expect(fastifyClientStatus({ statusCode: 400.5 })).toBeUndefined()
    expect(fastifyClientStatus({ statusCode: 399 })).toBeUndefined()
    expect(fastifyClientStatus(null)).toBeUndefined()
  })
})
